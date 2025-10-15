import OpenAI from 'openai';
import { config } from '../utils/config';
import { AgentOutput, AgentOutputSchema, LoginHandlerInput, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';
import { loginHandlerTemplate } from '../prompts/templates/login-handler.template';
import { PromptBuilder } from '../prompts/builders/prompt-builder';

/**
 * Login Handler Agent V2
 *
 * Refactored to use the new Prompt Engineering system with:
 * - Response pattern examples
 * - Troubleshooting guides for login issues
 * - State-aware retry handling
 */
export class LoginHandlerAgentV2 {
  private openai: OpenAI;

  constructor() {
    console.log('🔧 [LoginHandlerV2] Initializing with Prompt Engineering system...');

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });

    console.log('✅ [LoginHandlerV2] Initialized');
  }

  async handle(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    try {
      const input: LoginHandlerInput = {
        issue_summary: request.forms.Summary,
        comment_content: request.forms.Comment.Content,
        metadata: {
          reporter: request.forms.Reporter,
          issue_type: request.forms["Issue Type"],
          created: request.forms.Created,
        },
      };

      const response = await this.generateResponse(state, input);
      const processingTime = Date.now() - startTime;

      const processingStep: ProcessingStep = {
        step_name: 'login_handling',
        agent_name: 'LoginHandlerAgentV2',
        timestamp: new Date().toISOString(),
        input,
        output: {
          ...response,
          processing_time: processingTime,
        },
        success: true,
      };

      return {
        current_response: response.response_content,
        processing_history: [processingStep],
        current_agent: 'LoginHandlerAgentV2',
        next_action: 'quality_evaluation',
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorStep: ProcessingStep = {
        step_name: 'login_handling',
        agent_name: 'LoginHandlerAgentV2',
        timestamp: new Date().toISOString(),
        input: {
          issue_summary: request.forms.Summary,
          comment_content: request.forms.Comment.Content,
          metadata: {},
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_login_handling',
          response_content: 'Login handling failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `Login handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async generateResponse(
    state: typeof WorkflowStateAnnotation.State,
    input: LoginHandlerInput
  ): Promise<AgentOutput> {
    console.log('🔑 [LoginHandlerV2] Generating response with response patterns...');

    // Build prompts with response patterns and troubleshooting
    const builtPrompt = PromptBuilder.build(
      loginHandlerTemplate,
      state,
      input,
      {
        contextOptions: {
          mode: 'relevant',
          includeExamples: true,  // Include proven response patterns
          includeTroubleshooting: true,  // Include login error solutions
          includeTechnicalProcedures: false,  // Not needed for simple issues
        },
        maxContextTokens: 4000,
        includeStateSummary: true,
        includeRetryInstructions: true,
      }
    );

    const validation = PromptBuilder.validate(builtPrompt);
    if (!validation.valid) {
      console.error('❌ [LoginHandlerV2] Prompt validation failed:', validation.errors);
      throw new Error(`Prompt validation failed: ${validation.errors.join(', ')}`);
    }

    console.log('📊 [LoginHandlerV2] Prompt built successfully');
    console.log('📏 [LoginHandlerV2] Estimated tokens:', builtPrompt.metadata.estimatedTokens);
    console.log('🔄 [LoginHandlerV2] Is retry:', builtPrompt.metadata.isRetry);

    console.log('🌐 [LoginHandlerV2] Calling OpenAI API...');

    const response = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: builtPrompt.systemPrompt },
        { role: 'user', content: builtPrompt.userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'login_handler_response',
          schema: AgentOutputSchema,
        },
      },
      temperature: 0.3,
    });

    console.log('✅ [LoginHandlerV2] Response generated successfully');

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response received from OpenAI');
    }

    return JSON.parse(result) as AgentOutput;
  }
}
