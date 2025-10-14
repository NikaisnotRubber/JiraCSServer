import { randomUUID } from 'crypto';
import { WorkflowStateUtils } from './state';
import { JiraIssueInput } from '../types';
import { app } from './graph';
import { config } from '../utils/config';

export class JiraWorkflowOrchestrator {
  private useMockAgents: boolean;

  constructor() {
    this.useMockAgents = config.app.testMode || !process.env.OPENAI_API_KEY;
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
    const sendToJira = options?.sendToJira ?? true; // 默认发送到 Jira

    const modeLabel = this.useMockAgents ? '[MOCK MODE] ' : '';
    const sendLabel = sendToJira ? '' : '[TEST MODE - NO SEND] ';
    console.log(`🚀 ${sendLabel}${modeLabel}Starting workflow ${workflowId} for issue: ${request.forms["Project ID"]}`);

    try {
      const initialState = {
        ...WorkflowStateUtils.createInitialState(request, workflowId),
        send_to_jira: sendToJira,
      };

      const result = await app.invoke(initialState, {
        recursionLimit: 50,
      });
      const processingTime = Date.now() - startTime;

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
