import { PromptContext, JiraKnowledgeContext, TechnicalKnowledgeContext, TroubleshootingContext } from '../templates/base-template';
import { WorkflowStateAnnotation } from '../../workflow/state';
import { jiraKnowledgeBase, getRelevantJiraKnowledge } from '../contexts/jira-knowledge-base';
import { technicalProcedures, getRelevantProcedures } from '../contexts/technical-procedures';
import { troubleshootingGuides, findRelevantErrors } from '../contexts/troubleshooting-guides';
import { getResponsePatterns } from '../contexts/response-patterns';
import { StateContextExtractor } from './state-context-extractor';

/**
 * Context Assembler
 *
 * Assembles rich, relevant context for prompts by combining:
 * - Domain knowledge (Jira features, integrations)
 * - Technical procedures
 * - Troubleshooting guides
 * - Response patterns
 * - Workflow state information
 *
 * This is the key to replacing RAG: instead of retrieving context,
 * we intelligently compose it based on keywords and state.
 */

export interface ContextAssemblyOptions {
  /**
   * Include full knowledge base or only relevant sections
   */
  mode: 'full' | 'relevant' | 'minimal';

  /**
   * Include response patterns/examples
   */
  includeExamples: boolean;

  /**
   * Include troubleshooting guides
   */
  includeTroubleshooting: boolean;

  /**
   * Include technical procedures
   */
  includeTechnicalProcedures: boolean;

  /**
   * Maximum context size (for token management)
   */
  maxContextTokens?: number;
}

/**
 * Default assembly options by agent type
 */
export const CONTEXT_PRESETS: Record<string, ContextAssemblyOptions> = {
  classifier: {
    mode: 'minimal',
    includeExamples: false,
    includeTroubleshooting: false,
    includeTechnicalProcedures: false,
  },
  loginHandler: {
    mode: 'relevant',
    includeExamples: true,
    includeTroubleshooting: true,
    includeTechnicalProcedures: false,
  },
  complexHandler: {
    mode: 'relevant',
    includeExamples: true,
    includeTroubleshooting: true,
    includeTechnicalProcedures: true,
  },
  generalHandler: {
    mode: 'relevant',
    includeExamples: true,
    includeTroubleshooting: false,
    includeTechnicalProcedures: false,
  },
  qualityEvaluator: {
    mode: 'minimal',
    includeExamples: true,
    includeTroubleshooting: false,
    includeTechnicalProcedures: false,
  },
};

/**
 * Context Assembler
 */
export class ContextAssembler {
  /**
   * Assemble full prompt context based on workflow state
   */
  static assemble(
    state: typeof WorkflowStateAnnotation.State,
    agentType: string,
    options?: Partial<ContextAssemblyOptions>
  ): PromptContext {
    // Get preset options for agent type
    const preset = CONTEXT_PRESETS[agentType] || CONTEXT_PRESETS.generalHandler;
    const finalOptions = { ...preset, ...options };

    // Extract state context
    const stateContext = StateContextExtractor.extract(state);
    const keywords = stateContext.issue.keywords;

    // Assemble knowledge bases
    const knowledgeBases: PromptContext['knowledgeBases'] = {};

    // Jira knowledge
    if (finalOptions.mode === 'full') {
      knowledgeBases.jira = jiraKnowledgeBase;
    } else if (finalOptions.mode === 'relevant') {
      knowledgeBases.jira = getRelevantJiraKnowledge(keywords);
    }

    // Technical procedures
    if (finalOptions.includeTechnicalProcedures) {
      if (finalOptions.mode === 'full') {
        knowledgeBases.technical = technicalProcedures;
      } else if (finalOptions.mode === 'relevant') {
        knowledgeBases.technical = getRelevantProcedures(keywords);
      }
    }

    // Troubleshooting
    if (finalOptions.includeTroubleshooting) {
      const relevantErrors = findRelevantErrors(keywords);
      knowledgeBases.troubleshooting = {
        errorPatterns: relevantErrors.length > 0 ? relevantErrors : troubleshootingGuides.errorPatterns.slice(0, 2),
        escalationCriteria: troubleshootingGuides.escalationCriteria,
      };
    }

    // Response patterns
    let responsePatterns = undefined;
    if (finalOptions.includeExamples && stateContext.classification) {
      responsePatterns = getResponsePatterns(stateContext.classification.category);
    }

    // Build prompt context
    const context: PromptContext = {
      knowledgeBases,
      workflowState: state,
      responsePatterns,
      metadata: {
        agentType,
        assemblyMode: finalOptions.mode,
        keywords,
        isRetry: StateContextExtractor.isRetry(state),
      },
    };

    return context;
  }

  /**
   * Build a formatted context string for injection into prompts
   */
  static formatContextForPrompt(context: PromptContext): string {
    const sections: string[] = [];

    // Jira knowledge base
    if (context.knowledgeBases?.jira) {
      sections.push(this.formatJiraKnowledge(context.knowledgeBases.jira));
    }

    // Technical procedures
    if (context.knowledgeBases?.technical) {
      sections.push(this.formatTechnicalProcedures(context.knowledgeBases.technical));
    }

    // Troubleshooting
    if (context.knowledgeBases?.troubleshooting) {
      sections.push(this.formatTroubleshooting(context.knowledgeBases.troubleshooting));
    }

    // Response patterns
    if (context.responsePatterns && context.responsePatterns.length > 0) {
      sections.push(this.formatResponsePatterns(context.responsePatterns));
    }

    return sections.join('\n\n');
  }

  /**
   * Format Jira knowledge base section
   */
  private static formatJiraKnowledge(jira: JiraKnowledgeContext): string {
    const lines: string[] = ['**📚 Jira Domain Knowledge:**'];

    if (jira.features.length > 0) {
      lines.push('\n**Feature Areas:**');
      jira.features.forEach(feature => {
        lines.push(`\n**${feature.category}:**`);
        lines.push(`- ${feature.description}`);
        if (feature.commonIssues.length > 0) {
          lines.push(`- Common Issues: ${feature.commonIssues.slice(0, 3).join('; ')}`);
        }
      });
    }

    if (jira.integrations.length > 0) {
      lines.push('\n**Key Integrations:**');
      jira.integrations.forEach(integration => {
        lines.push(`\n**${integration.name}:**`);
        lines.push(`- ${integration.description}`);
        if (integration.commonProblems.length > 0) {
          lines.push(`- Common Problems: ${integration.commonProblems.slice(0, 2).join('; ')}`);
        }
      });
    }

    return lines.join('\n');
  }

  /**
   * Format technical procedures section
   */
  private static formatTechnicalProcedures(technical: TechnicalKnowledgeContext): string {
    const lines: string[] = ['**🔧 Technical Procedures:**'];

    if (technical.diagnosticProcedures.length > 0) {
      lines.push('\n**Diagnostic Steps:**');
      technical.diagnosticProcedures.slice(0, 2).forEach((proc, index) => {
        lines.push(`\n${index + 1}. **${proc.symptom}:**`);
        proc.steps.slice(0, 5).forEach(step => {
          lines.push(`   ${step}`);
        });
      });
    }

    if (technical.scriptExamples && technical.scriptExamples.length > 0) {
      lines.push('\n**Script Examples:**');
      technical.scriptExamples.slice(0, 1).forEach(example => {
        lines.push(`\n**${example.useCase}:**`);
        lines.push(`\`\`\`${example.language}`);
        lines.push(example.code);
        lines.push('```');
        lines.push(`Explanation: ${example.explanation}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format troubleshooting section
   */
  private static formatTroubleshooting(troubleshooting: TroubleshootingContext): string {
    const lines: string[] = ['**🔍 Troubleshooting Guides:**'];

    if (troubleshooting.errorPatterns.length > 0) {
      troubleshooting.errorPatterns.slice(0, 2).forEach(error => {
        lines.push(`\n**${error.errorType}:**`);
        lines.push(`- Symptoms: ${error.symptoms.slice(0, 2).join('; ')}`);
        lines.push(`- Root Causes: ${error.rootCauses.slice(0, 2).join('; ')}`);
        lines.push(`- Solutions: ${error.solutions.slice(0, 3).join('; ')}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format response patterns section
   */
  private static formatResponsePatterns(patterns: any[]): string {
    const lines: string[] = ['**📝 Response Pattern Guidelines:**'];

    patterns.slice(0, 2).forEach(pattern => {
      lines.push(`\n**${pattern.name}:**`);
      lines.push(`- Use when: ${pattern.applicableWhen}`);
      lines.push(`- Structure: ${pattern.structure.join(' → ')}`);

      if (pattern.examples && pattern.examples.length > 0) {
        const example = pattern.examples[0];
        lines.push(`\n**Example Scenario:** ${example.scenario}`);
        lines.push('**Example Response:**');
        lines.push(example.response.substring(0, 500) + '...');
      }
    });

    return lines.join('\n');
  }

  /**
   * Estimate token count (rough approximation)
   */
  static estimateTokens(context: PromptContext): number {
    const formatted = this.formatContextForPrompt(context);
    // Rough estimate: ~4 characters per token
    return Math.ceil(formatted.length / 4);
  }

  /**
   * Optimize context to fit within token budget
   */
  static optimizeForTokenBudget(
    context: PromptContext,
    maxTokens: number
  ): PromptContext {
    let currentTokens = this.estimateTokens(context);

    if (currentTokens <= maxTokens) {
      return context;
    }

    // Progressive reduction strategy
    const optimized = { ...context };

    // 1. Reduce response patterns
    if (optimized.responsePatterns && optimized.responsePatterns.length > 1) {
      optimized.responsePatterns = optimized.responsePatterns.slice(0, 1);
      currentTokens = this.estimateTokens(optimized);
    }

    // 2. Reduce troubleshooting
    if (currentTokens > maxTokens && optimized.knowledgeBases?.troubleshooting) {
      optimized.knowledgeBases.troubleshooting.errorPatterns =
        optimized.knowledgeBases.troubleshooting.errorPatterns.slice(0, 1);
      currentTokens = this.estimateTokens(optimized);
    }

    // 3. Reduce technical procedures
    if (currentTokens > maxTokens && optimized.knowledgeBases?.technical) {
      optimized.knowledgeBases.technical.diagnosticProcedures =
        optimized.knowledgeBases.technical.diagnosticProcedures.slice(0, 1);
      optimized.knowledgeBases.technical.scriptExamples =
        optimized.knowledgeBases.technical.scriptExamples.slice(0, 1);
      currentTokens = this.estimateTokens(optimized);
    }

    return optimized;
  }
}
