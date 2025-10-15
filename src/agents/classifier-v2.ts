import OpenAI from 'openai';
import { config } from '../utils/config';
import { ClassificationResult, ClassificationSchema, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';
import { classifierTemplate } from '../prompts/templates/classifier.template';
import { PromptBuilder } from '../prompts/builders/prompt-builder';
import { WorkflowLogger } from '../utils/workflow-logger';

/**
 * Problem Classification Agent V2
 *
 * Refactored to use the new Prompt Engineering system:
 * - Prompts decoupled into templates
 * - Context-aware prompt building
 * - Rich domain knowledge injection
 * - State-aware retry handling
 */
export class ProblemClassificationAgentV2 {
  private openai: OpenAI;

  constructor() {
    console.log('🔧 [ProblemClassificationAgentV2] Initializing with Prompt Engineering system...');
    console.log('📝 [Config] Model:', config.openai.model);
    console.log('📝 [Config] Base URL:', config.openai.baseUrl);

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });

    console.log('✅ [ProblemClassificationAgentV2] Initialized');
  }

  async classify(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    WorkflowLogger.logStateEntry('Classification', state);

    try {
      const classification = await this.performClassification(state, request);
      const processingTime = Date.now() - startTime;

      const processingStep: ProcessingStep = {
        step_name: 'classification',
        agent_name: 'ProblemClassificationAgentV2',
        timestamp: new Date().toISOString(),
        input: {
          summary: request.forms.Summary,
          comment: request.forms.Comment.Content,
        },
        output: {
          classification: classification.category,
          confidence: classification.confidence,
          suggested_action: `Route to ${classification.category.toLowerCase()} handler`,
          response_content: classification.reasoning,
          metadata: {
            key_indicators: classification.key_indicators,
          },
          processing_time: processingTime,
        },
        success: true,
      };

      const updates = {
        classification,
        processing_history: [processingStep],
        current_agent: 'ProblemClassificationAgentV2',
        next_action: this.determineNextAction(classification),
        has_error: false,
      };

      WorkflowLogger.logStateExit('Classification', updates, processingTime);
      return updates;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorStep: ProcessingStep = {
        step_name: 'classification',
        agent_name: 'ProblemClassificationAgentV2',
        timestamp: new Date().toISOString(),
        input: {
          summary: request.forms.Summary,
          comment: request.forms.Comment.Content,
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_classification',
          response_content: 'Classification failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async performClassification(
    state: typeof WorkflowStateAnnotation.State,
    request: any
  ): Promise<ClassificationResult> {
    const summary = request.forms.Summary;
    const comment = request.forms.Comment.Content;

    console.log('🔍 [ClassifierV2] Starting classification with Prompt Engineering system...');
    console.log('📄 [ClassifierV2] Summary:', summary.substring(0, 50) + '...');
    console.log('💬 [ClassifierV2] Comment:', comment.substring(0, 50) + '...');

    // Build prompts using the new system
    const builtPrompt = PromptBuilder.build(
      classifierTemplate,
      state,
      { summary, comment },
      {
        contextOptions: {
          mode: 'relevant',  // Only relevant knowledge, not full KB
          includeExamples: false,
          includeTroubleshooting: false,
          includeTechnicalProcedures: false,
        },
        maxContextTokens: 2000,  // Limit context size for classifier
      }
    );

    // Validate built prompt
    const validation = PromptBuilder.validate(builtPrompt);
    if (!validation.valid) {
      console.error('❌ [ClassifierV2] Prompt validation failed:', validation.errors);
      throw new Error(`Prompt validation failed: ${validation.errors.join(', ')}`);
    }

    console.log('📊 [ClassifierV2] Prompt built successfully');
    console.log('📏 [ClassifierV2] Estimated tokens:', builtPrompt.metadata.estimatedTokens);
    console.log('🔄 [ClassifierV2] Is retry:', builtPrompt.metadata.isRetry);

    console.log('🌐 [ClassifierV2] Calling OpenAI API...');

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: builtPrompt.systemPrompt },
          { role: 'user', content: builtPrompt.userPrompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'problem_classification',
            schema: ClassificationSchema,
          },
        },
        temperature: 0.1,
      });

      console.log('✅ [ClassifierV2] OpenAI API call successful');

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No classification result received from OpenAI');
      }

      return JSON.parse(result) as ClassificationResult;
    } catch (error: any) {
      console.error('❌ [ClassifierV2] OpenAI API call failed');
      console.error('❌ [ClassifierV2] Error type:', error?.constructor?.name || 'Unknown');
      console.error('❌ [ClassifierV2] Error message:', error?.message || String(error));
      if (error?.status) {
        console.error('❌ [ClassifierV2] HTTP Status:', error.status);
      }
      if (error?.code) {
        console.error('❌ [ClassifierV2] Error code:', error.code);
      }
      throw error;
    }
  }

  private determineNextAction(classification: ClassificationResult): string {
    switch (classification.category) {
      case 'JIRA_SIMPLE':
        return 'login_handler';
      case 'JIRA_COMPLEX':
        return 'complex_handler';
      case 'GENERAL':
        return 'general_handler';
      default:
        return 'general_handler';
    }
  }
}
