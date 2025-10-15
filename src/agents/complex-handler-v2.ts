import OpenAI from 'openai';
import { config } from '../utils/config';
import { AgentOutput, AgentOutputSchema, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';
import { complexHandlerTemplate } from '../prompts/templates/complex-handler.template';
import { PromptBuilder } from '../prompts/builders/prompt-builder';

/**
 * Complex Handler Agent V2
 *
 * Refactored to use the new Prompt Engineering system with:
 * - Rich technical knowledge base context
 * - Troubleshooting guides
 * - Multi-hop reasoning support
 * - State-aware retry handling with quality feedback
 */
export class ComplexHandlerAgentV2 {
  private openai: OpenAI;

  constructor() {
    console.log('🔧 [ComplexHandlerV2] Initializing with Prompt Engineering system...');

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });

    console.log('✅ [ComplexHandlerV2] Initialized');
  }

  async handle(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    try {
      const input = {
        issue_summary: request.forms.Summary,
        comment_content: request.forms.Comment.Content,
        metadata: {
          reporter: request.forms.Reporter,
          issue_type: request.forms["Issue Type"],
          created: request.forms.Created,
          classification: state.classification,
        },
      };

      const response = await this.generateResponse(state, input);
      const processingTime = Date.now() - startTime;

      const processingStep: ProcessingStep = {
        step_name: 'complex_handling',
        agent_name: 'ComplexHandlerAgentV2',
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
        current_agent: 'ComplexHandlerAgentV2',
        next_action: 'quality_evaluation',
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorStep: ProcessingStep = {
        step_name: 'complex_handling',
        agent_name: 'ComplexHandlerAgentV2',
        timestamp: new Date().toISOString(),
        input: {
          issue_summary: request.forms.Summary,
          comment_content: request.forms.Comment.Content,
          metadata: {},
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_complex_handling',
          response_content: 'Complex handling failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `Complex handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async generateResponse(
    state: typeof WorkflowStateAnnotation.State,
    input: any
  ): Promise<AgentOutput> {
    console.log('⚙️ [ComplexHandlerV2] Generating response with rich context...');

    // Build prompts with full technical context
    const builtPrompt = PromptBuilder.build(
      complexHandlerTemplate,
      state,
      input,
      {
        contextOptions: {
          mode: 'relevant',  // Relevant knowledge based on keywords
          includeExamples: true,  // Include response patterns
          includeTroubleshooting: true,  // Include error diagnostics
          includeTechnicalProcedures: true,  // Include script examples & procedures
        },
        maxContextTokens: 8000,  // Allow rich context for complex issues
        includeStateSummary: true,
        includeRetryInstructions: true,  // Auto-included if retry
      }
    );

    const validation = PromptBuilder.validate(builtPrompt);
    if (!validation.valid) {
      console.error('❌ [ComplexHandlerV2] Prompt validation failed:', validation.errors);
      throw new Error(`Prompt validation failed: ${validation.errors.join(', ')}`);
    }

    console.log('📊 [ComplexHandlerV2] Prompt built successfully');
    console.log('📏 [ComplexHandlerV2] Estimated tokens:', builtPrompt.metadata.estimatedTokens);
    console.log('🔄 [ComplexHandlerV2] Is retry:', builtPrompt.metadata.isRetry);

    console.log('🌐 [ComplexHandlerV2] Calling OpenAI API...');

    const response = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: builtPrompt.systemPrompt },
        { role: 'user', content: builtPrompt.userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'complex_handler_response',
          schema: AgentOutputSchema,
        },
      },
      temperature: 0.3,
    });

    console.log('✅ [ComplexHandlerV2] Response generated successfully');

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response received from OpenAI');
    }

    return JSON.parse(result) as AgentOutput;
  }
}
