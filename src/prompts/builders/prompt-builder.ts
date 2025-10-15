import { WorkflowStateAnnotation } from '../../workflow/state';
import { PromptTemplate, PromptContext } from '../templates/base-template';
import { ContextAssembler, ContextAssemblyOptions } from './context-assembler';
import { StateContextExtractor } from './state-context-extractor';

/**
 * Prompt Builder
 *
 * Central service for building prompts with rich context.
 * This is the main interface that agents will use to construct prompts.
 *
 * Features:
 * - State-aware context injection
 * - Automatic context assembly based on keywords
 * - Retry-aware prompt adjustment
 * - Token budget management
 */

export interface BuildPromptOptions {
  /**
   * Optional override for context assembly
   */
  contextOptions?: Partial<ContextAssemblyOptions>;

  /**
   * Maximum tokens for context (for budget management)
   */
  maxContextTokens?: number;

  /**
   * Include workflow state summary in prompt
   */
  includeStateSummary?: boolean;

  /**
   * Include retry instructions (auto-detected by default)
   */
  includeRetryInstructions?: boolean;
}

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  context: PromptContext;
  metadata: {
    templateId: string;
    templateVersion: string;
    estimatedTokens: number;
    isRetry: boolean;
  };
}

/**
 * Prompt Builder Service
 */
export class PromptBuilder {
  /**
   * Build prompts using a template and workflow state
   */
  static build(
    template: PromptTemplate,
    state: typeof WorkflowStateAnnotation.State,
    userInput: any,
    options: BuildPromptOptions = {}
  ): BuiltPrompt {
    // Extract agent type from template ID
    const agentType = this.extractAgentType(template.id);

    // Assemble context
    let context = ContextAssembler.assemble(state, agentType, options.contextOptions);

    // Optimize for token budget if specified
    if (options.maxContextTokens) {
      context = ContextAssembler.optimizeForTokenBudget(context, options.maxContextTokens);
    }

    // Build prompts using template
    const systemPrompt = this.buildSystemPrompt(template, context, state, options);
    const userPrompt = this.buildUserPrompt(template, userInput, context, state, options);

    // Estimate tokens
    const estimatedTokens = this.estimateTotalTokens(systemPrompt, userPrompt);

    return {
      systemPrompt,
      userPrompt,
      context,
      metadata: {
        templateId: template.id,
        templateVersion: template.version,
        estimatedTokens,
        isRetry: StateContextExtractor.isRetry(state),
      },
    };
  }

  /**
   * Build system prompt with context
   */
  private static buildSystemPrompt(
    template: PromptTemplate,
    context: PromptContext,
    state: typeof WorkflowStateAnnotation.State,
    options: BuildPromptOptions
  ): string {
    const sections: string[] = [];

    // 1. Base system prompt from template
    sections.push(template.buildSystemPrompt(context));

    // 2. Contextual knowledge
    const formattedContext = ContextAssembler.formatContextForPrompt(context);
    if (formattedContext) {
      sections.push('\n---\n');
      sections.push('**CONTEXTUAL KNOWLEDGE:**');
      sections.push('Use the following knowledge to inform your response:\n');
      sections.push(formattedContext);
    }

    // 3. State summary (if requested)
    if (options.includeStateSummary !== false) {
      const stateContext = StateContextExtractor.extract(state);
      const stateSummary = StateContextExtractor.buildContextSummary(stateContext);
      if (stateSummary) {
        sections.push('\n---\n');
        sections.push(stateSummary);
      }
    }

    // 4. Retry instructions (if applicable)
    const includeRetry = options.includeRetryInstructions !== false;
    if (includeRetry && StateContextExtractor.isRetry(state)) {
      const stateContext = StateContextExtractor.extract(state);
      const retryInstructions = StateContextExtractor.getRetryInstructions(stateContext);
      if (retryInstructions) {
        sections.push('\n---\n');
        sections.push(retryInstructions);
      }
    }

    return sections.join('\n');
  }

  /**
   * Build user prompt
   */
  private static buildUserPrompt(
    template: PromptTemplate,
    userInput: any,
    context: PromptContext,
    state: typeof WorkflowStateAnnotation.State,
    options: BuildPromptOptions
  ): string {
    return template.buildUserPrompt(userInput, context);
  }

  /**
   * Extract agent type from template ID
   */
  private static extractAgentType(templateId: string): string {
    // Template IDs follow pattern: "agent-type.template"
    const match = templateId.match(/^(\w+)\.template$/);
    return match ? match[1] : 'general';
  }

  /**
   * Estimate total tokens
   */
  private static estimateTotalTokens(systemPrompt: string, userPrompt: string): number {
    const totalChars = systemPrompt.length + userPrompt.length;
    // Rough estimate: ~4 characters per token
    return Math.ceil(totalChars / 4);
  }

  /**
   * Build a quick prompt without full context assembly (for testing)
   */
  static buildMinimal(
    template: PromptTemplate,
    userInput: any
  ): { systemPrompt: string; userPrompt: string } {
    return {
      systemPrompt: template.buildSystemPrompt(),
      userPrompt: template.buildUserPrompt(userInput),
    };
  }

  /**
   * Validate a built prompt
   */
  static validate(prompt: BuiltPrompt): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!prompt.systemPrompt || prompt.systemPrompt.trim().length === 0) {
      errors.push('System prompt is empty');
    }

    if (!prompt.userPrompt || prompt.userPrompt.trim().length === 0) {
      errors.push('User prompt is empty');
    }

    if (prompt.metadata.estimatedTokens > 100000) {
      errors.push(`Estimated tokens (${prompt.metadata.estimatedTokens}) exceeds reasonable limit`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Convenience function for building prompts
 */
export function buildPrompt(
  template: PromptTemplate,
  state: typeof WorkflowStateAnnotation.State,
  userInput: any,
  options?: BuildPromptOptions
): BuiltPrompt {
  return PromptBuilder.build(template, state, userInput, options);
}
