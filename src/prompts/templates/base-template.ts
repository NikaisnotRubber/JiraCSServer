import { WorkflowStateAnnotation } from '../../workflow/state';

/**
 * Base interface for all prompt templates
 *
 * Templates are responsible for defining the structure and content of prompts,
 * while remaining decoupled from the LLM API calls.
 */
export interface PromptTemplate {
  /**
   * Unique identifier for this template
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Version for tracking changes
   */
  version: string;

  /**
   * Build the system prompt
   * @param context - Additional context for prompt construction
   */
  buildSystemPrompt(context?: PromptContext): string;

  /**
   * Build the user prompt
   * @param input - User-specific input data
   * @param context - Additional context
   */
  buildUserPrompt(input: any, context?: PromptContext): string;

  /**
   * Get required context keys for this template
   */
  getRequiredContexts(): string[];
}

/**
 * Context that can be injected into prompts
 */
export interface PromptContext {
  /**
   * Domain knowledge contexts
   */
  knowledgeBases?: {
    jira?: JiraKnowledgeContext;
    technical?: TechnicalKnowledgeContext;
    troubleshooting?: TroubleshootingContext;
  };

  /**
   * Workflow state (for state-aware prompting)
   */
  workflowState?: typeof WorkflowStateAnnotation.State;

  /**
   * Response patterns and examples
   */
  responsePatterns?: ResponsePattern[];

  /**
   * Custom metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Jira domain knowledge context
 */
export interface JiraKnowledgeContext {
  /**
   * Feature categories and descriptions
   */
  features: {
    category: string;
    description: string;
    commonIssues: string[];
    keywords: string[];
  }[];

  /**
   * Integration information
   */
  integrations: {
    name: string;
    description: string;
    commonProblems: string[];
  }[];

  /**
   * Best practices
   */
  bestPractices: string[];
}

/**
 * Technical knowledge context
 */
export interface TechnicalKnowledgeContext {
  /**
   * Diagnostic procedures
   */
  diagnosticProcedures: {
    symptom: string;
    steps: string[];
    expectedOutcome: string;
  }[];

  /**
   * Script examples
   */
  scriptExamples: {
    useCase: string;
    language: string;
    code: string;
    explanation: string;
  }[];

  /**
   * System configuration guides
   */
  configurationGuides: {
    topic: string;
    steps: string[];
    warnings: string[];
  }[];
}

/**
 * Troubleshooting context
 */
export interface TroubleshootingContext {
  /**
   * Common error patterns
   */
  errorPatterns: {
    errorType: string;
    symptoms: string[];
    rootCauses: string[];
    solutions: string[];
  }[];

  /**
   * Escalation criteria
   */
  escalationCriteria: {
    condition: string;
    action: string;
  }[];
}

/**
 * Response pattern with examples
 */
export interface ResponsePattern {
  /**
   * Pattern name
   */
  name: string;

  /**
   * When to use this pattern
   */
  applicableWhen: string;

  /**
   * Structure template
   */
  structure: string[];

  /**
   * Example responses
   */
  examples: {
    scenario: string;
    response: string;
  }[];
}

/**
 * Abstract base class for prompt templates
 */
export abstract class BasePromptTemplate implements PromptTemplate {
  abstract id: string;
  abstract name: string;
  abstract version: string;

  abstract buildSystemPrompt(context?: PromptContext): string;
  abstract buildUserPrompt(input: any, context?: PromptContext): string;
  abstract getRequiredContexts(): string[];

  /**
   * Helper to format context sections
   */
  protected formatContextSection(title: string, content: string[]): string {
    if (!content || content.length === 0) return '';
    return `\n**${title}:**\n${content.map(item => `- ${item}`).join('\n')}`;
  }

  /**
   * Helper to extract relevant knowledge from context
   */
  protected extractRelevantKnowledge(
    context: PromptContext | undefined,
    keywords: string[]
  ): string[] {
    if (!context?.knowledgeBases) return [];

    const relevant: string[] = [];
    const jira = context.knowledgeBases.jira;

    if (jira) {
      // Find features matching keywords
      jira.features.forEach(feature => {
        const hasMatch = keywords.some(keyword =>
          feature.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
        );
        if (hasMatch) {
          relevant.push(`${feature.category}: ${feature.description}`);
        }
      });
    }

    return relevant;
  }

  /**
   * Helper to build example section
   */
  protected buildExampleSection(patterns: ResponsePattern[]): string {
    if (!patterns || patterns.length === 0) return '';

    const examples = patterns.map(pattern => {
      return `**${pattern.name}:**\n${pattern.examples[0]?.response || ''}`;
    }).join('\n\n');

    return `\n**Response Examples:**\n${examples}`;
  }
}
