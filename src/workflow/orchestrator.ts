import { randomUUID } from 'crypto';
import { WorkflowStateUtils } from './state';
import { JiraIssueInput } from '../types';
import { initializeWorkflow } from './graph';
import { getThreadId, hasCheckpoint, createCheckpointer } from './checkpoint';
import { config } from '../utils/config';
import { contextRetriever } from '../services/context-retriever';
import { contextManager } from '../services/context-manager';
import { initializeDatabase } from '../database/client';
import { app as nonCheckpointedApp } from './graph';

export class JiraWorkflowOrchestrator {
  private useMockAgents: boolean;
  private dbInitialized: boolean = false;
  private workflowApp: Awaited<ReturnType<typeof initializeWorkflow>> | null = null;

  constructor() {
    this.useMockAgents = config.app.testMode || !process.env.OPENAI_API_KEY;
  }

  /**
   * Initialize workflow with LangMem checkpointing (lazy initialization)
   */
  private async ensureWorkflow(): Promise<Awaited<ReturnType<typeof initializeWorkflow>>> {
    if (!this.workflowApp) {
      this.workflowApp = await initializeWorkflow();
    }
    return this.workflowApp;
  }

  /**
   * Initialize database connection (lazy initialization)
   */
  private async ensureDatabase(): Promise<void> {
    if (!this.dbInitialized) {
      try {
        await initializeDatabase();
        this.dbInitialized = true;
      } catch (error: any) {
        console.warn('⚠️ Database initialization failed, context features disabled:', error?.message);
      }
    }
  }

  async processRequest(
    request: JiraIssueInput,
    options?: { sendToJira?: boolean }
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    workflow_id: string;
    processing_time: number;
    mock_mode?: boolean;
  }> {
    const startTime = Date.now();
    const workflowId = randomUUID();
    const sendToJira = options?.sendToJira ?? true;
    const projectId = request.forms["Project ID"];

    const modeLabel = this.useMockAgents ? '[MOCK MODE] ' : '';
    const sendLabel = sendToJira ? '' : '[TEST MODE - NO SEND] ';
    console.log(`🚀 ${sendLabel}${modeLabel}Starting workflow ${workflowId} for issue: ${projectId}`);

    try {
      // Initialize database first to check for checkpoints
      await this.ensureDatabase();

      // Generate thread_id from Project ID
      const threadId = getThreadId(projectId);

      // Check if this Project ID has existing checkpoints
      let useCheckpointer = false;
      try {
        await createCheckpointer(); // Ensure checkpointer is initialized
        useCheckpointer = await hasCheckpoint(projectId);

        if (useCheckpointer) {
          console.log(`📚 Found existing conversation for ${projectId}, using LangMem checkpointer`);
        } else {
          console.log(`📭 No existing conversation for ${projectId}, processing without checkpointer`);
        }
      } catch (error: any) {
        console.warn('⚠️ Failed to check checkpoint, proceeding without checkpointer:', error?.message);
      }

      // Load historical context from database (for custom context injection)
      // NOTE: This is kept for backward compatibility and additional context beyond LangMem
      let historicalContext = {
        hasHistory: false,
        contextSummary: '',
        formattedContext: '',
      };

      if (this.dbInitialized) {
        try {
          historicalContext = await contextRetriever.buildContextForState(projectId);
          if (historicalContext.hasHistory) {
            console.log(`📚 Loaded custom historical context: ${historicalContext.contextSummary}`);
          }
        } catch (error: any) {
          console.warn('⚠️ Failed to load custom historical context:', error?.message);
        }
      }

      const initialState = {
        ...WorkflowStateUtils.createInitialState(request, workflowId),
        send_to_jira: sendToJira,
        project_id: projectId,
        historical_context: historicalContext,
      };

      // Invoke workflow: use checkpointer if conversation exists, otherwise use regular workflow
      let result;
      if (useCheckpointer) {
        // Existing conversation - use checkpointed workflow to maintain context
        console.log(`🧵 Using checkpointed workflow with thread_id: ${threadId}`);
        const checkpointedApp = await this.ensureWorkflow();
        result = await checkpointedApp.invoke(initialState, {
          recursionLimit: 50,
          configurable: {
            thread_id: threadId,
          },
        });
      } else {
        // First interaction - use checkpointed workflow to create initial checkpoint
        // This ensures the next interaction for this Project ID will find a checkpoint
        console.log(`🔧 First interaction for ${projectId}, creating initial checkpoint`);
        try {
          const checkpointedApp = await this.ensureWorkflow();
          result = await checkpointedApp.invoke(initialState, {
            recursionLimit: 50,
            configurable: {
              thread_id: threadId,
            },
          });
          console.log(`✅ Initial checkpoint created for ${projectId}`);
        } catch (error: any) {
          console.warn(`⚠️ Failed to create checkpoint, falling back to non-checkpointed workflow:`, error?.message);
          result = await nonCheckpointedApp.invoke(initialState, {
            recursionLimit: 50,
          });
        }
      }

      const processingTime = Date.now() - startTime;

      // Save interaction to custom database (for analytics and custom features)
      // NOTE: LangMem handles workflow state persistence automatically
      if (this.dbInitialized && result.final_output) {
        try {
          await this.saveInteraction(projectId, workflowId, request, result);

          // Trigger compression if needed (custom context management)
          await contextRetriever.triggerCompressionIfNeeded(projectId);
        } catch (error: any) {
          console.warn('⚠️ Failed to save custom interaction data:', error?.message);
        }
      }

      console.log(`✅ ${sendLabel}${modeLabel}Workflow ${workflowId} completed in ${processingTime}ms`);

      return {
        success: !result.has_error,
        result,
        error: result.error_message,
        workflow_id: workflowId,
        processing_time: processingTime,
        mock_mode: this.useMockAgents,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ ${sendLabel}${modeLabel}Workflow ${workflowId} failed:`, error);

      return {
        success: false,
        error: error?.message || 'Unknown workflow error',
        workflow_id: workflowId,
        processing_time: processingTime,
        mock_mode: this.useMockAgents,
      };
    }
  }

  /**
   * Save interaction to database
   */
  private async saveInteraction(
    projectId: string,
    workflowId: string,
    request: JiraIssueInput,
    result: any
  ): Promise<void> {
    try {
      const lastStep = result.processing_history?.[result.processing_history.length - 1];

      await contextManager.saveInteraction({
        projectId,
        workflowId,
        userQuestion: request.forms.Comment.Content,
        issueType: request.forms["Issue Type"],
        reporter: request.forms.Reporter,
        classification: result.classification?.category,
        classificationConfidence: result.classification?.confidence
          ? Math.round(result.classification.confidence * 100)
          : undefined,
        agentResponse: result.current_response || '',
        responseAgent: result.current_agent,
        qualityScore: result.quality_score
          ? Math.round(result.quality_score * 100)
          : undefined,
        qualityFeedback: result.quality_feedback,
        totalTokens: lastStep?.output?.metadata?.totalTokens,
        processingTimeMs: Date.now() - new Date(result.started_at).getTime(),
        metadata: {
          workflowId,
          hasError: result.has_error,
          retryCount: result.retry_count,
        },
      });

      console.log(`💾 Saved interaction for ${projectId}`);
    } catch (error: any) {
      console.error('❌ Failed to save interaction:', error?.message);
    }
  }

  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    version: string;
  }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    };
  }

  getInfo(): {
    nodeCount: number;
    agentTypes: string[];
    maxRetries: number;
  } {
    return {
      nodeCount: 7,
      agentTypes: ['classifier', 'login', 'complex', 'general', 'quality'],
      maxRetries: 3,
    };
  }
}
