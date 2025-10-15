import { WorkflowStateAnnotation } from '../../workflow/state';
import { extractKeywords } from '../contexts/jira-knowledge-base';

/**
 * State Context Extractor
 *
 * Extracts relevant context information from the LangGraph workflow state.
 * This enables state-aware prompting where prompts adapt based on:
 * - Previous agent outputs
 * - Retry history
 * - Quality feedback
 * - Processing history
 */

export interface StateContext {
  /**
   * Current workflow metadata
   */
  workflowInfo: {
    workflowId: string;
    currentAgent: string;
    retryCount: number;
    hasError: boolean;
  };

  /**
   * Issue information
   */
  issue: {
    projectId: string;
    issueType: string;
    reporter: string;
    summary: string;
    content: string;
    keywords: string[];
  };

  /**
   * Previous processing context (for retries)
   */
  previousAttempts?: {
    count: number;
    lastError?: string;
    qualityFeedback?: string;
    previousResponse?: string;
  };

  /**
   * Classification context
   */
  classification?: {
    category: string;
    confidence: number;
    reasoning: string;
    keyIndicators: string[];
  };

  /**
   * Quality assessment context (for retries)
   */
  qualityContext?: {
    score: number;
    feedback: string;
    improvementSuggestions: string[];
  };
}

/**
 * Extract comprehensive context from workflow state
 */
export class StateContextExtractor {
  /**
   * Extract all relevant context from the current workflow state
   */
  static extract(state: typeof WorkflowStateAnnotation.State): StateContext {
    const request = state.original_request;

    // Extract keywords from issue content
    const keywords = extractKeywords(
      request.forms.Summary,
      request.forms.Comment.Content
    );

    const context: StateContext = {
      workflowInfo: {
        workflowId: state.workflow_id,
        currentAgent: state.current_agent || 'unknown',
        retryCount: state.retry_count,
        hasError: state.has_error,
      },

      issue: {
        projectId: request.forms['Project ID'],
        issueType: request.forms['Issue Type'],
        reporter: request.forms.Reporter,
        summary: request.forms.Summary,
        content: request.forms.Comment.Content,
        keywords,
      },
    };

    // Add classification context if available
    if (state.classification) {
      context.classification = {
        category: state.classification.category,
        confidence: state.classification.confidence,
        reasoning: state.classification.reasoning,
        keyIndicators: state.classification.key_indicators,
      };
    }

    // Add previous attempt context for retries
    if (state.retry_count > 0) {
      context.previousAttempts = {
        count: state.retry_count,
        lastError: state.error_message,
        qualityFeedback: state.quality_feedback,
        previousResponse: state.current_response,
      };

      // Add quality context if available
      if (state.quality_assessment) {
        context.qualityContext = {
          score: state.quality_assessment.score,
          feedback: state.quality_assessment.feedback,
          improvementSuggestions: state.quality_assessment.improvement_suggestions,
        };
      }
    }

    return context;
  }

  /**
   * Build a context summary string for injection into prompts
   */
  static buildContextSummary(context: StateContext): string {
    const sections: string[] = [];

    // Workflow context
    sections.push(`**Workflow Context:**`);
    sections.push(`- Workflow ID: ${context.workflowInfo.workflowId}`);
    sections.push(`- Current Agent: ${context.workflowInfo.currentAgent}`);

    // Issue context
    sections.push(`\n**Issue Context:**`);
    sections.push(`- Project: ${context.issue.projectId}`);
    sections.push(`- Issue Type: ${context.issue.issueType}`);
    sections.push(`- Reporter: ${context.issue.reporter}`);
    sections.push(`- Identified Keywords: ${context.issue.keywords.join(', ')}`);

    // Classification context
    if (context.classification) {
      sections.push(`\n**Classification:**`);
      sections.push(`- Category: ${context.classification.category}`);
      sections.push(`- Confidence: ${(context.classification.confidence * 100).toFixed(0)}%`);
      sections.push(`- Reasoning: ${context.classification.reasoning}`);
    }

    // Retry context
    if (context.previousAttempts && context.previousAttempts.count > 0) {
      sections.push(`\n**⚠️ This is Retry Attempt #${context.previousAttempts.count}:**`);

      if (context.qualityContext) {
        sections.push(`- Previous Quality Score: ${context.qualityContext.score}/100`);
        sections.push(`- Quality Feedback: ${context.qualityContext.feedback}`);

        if (context.qualityContext.improvementSuggestions.length > 0) {
          sections.push(`- Improvement Needed:`);
          context.qualityContext.improvementSuggestions.forEach(suggestion => {
            sections.push(`  • ${suggestion}`);
          });
        }
      }

      if (context.previousAttempts.previousResponse) {
        sections.push(`\n**Previous Response (to improve):**`);
        sections.push(context.previousAttempts.previousResponse);
      }
    }

    return sections.join('\n');
  }

  /**
   * Check if this is a retry situation
   */
  static isRetry(state: typeof WorkflowStateAnnotation.State): boolean {
    return state.retry_count > 0;
  }

  /**
   * Get retry-specific instructions
   */
  static getRetryInstructions(context: StateContext): string {
    if (!context.previousAttempts || context.previousAttempts.count === 0) {
      return '';
    }

    const instructions: string[] = [
      '\n**🔄 RETRY INSTRUCTIONS:**',
      'This is a retry attempt. The previous response did not meet quality standards.',
      '',
      '**You MUST address the following issues:**',
    ];

    if (context.qualityContext?.improvementSuggestions) {
      context.qualityContext.improvementSuggestions.forEach((suggestion, index) => {
        instructions.push(`${index + 1}. ${suggestion}`);
      });
    }

    instructions.push('');
    instructions.push('**Requirements for this retry:**');
    instructions.push('- Incorporate the quality feedback above');
    instructions.push('- Provide more detailed and specific information');
    instructions.push('- Ensure all aspects of the issue are addressed');
    instructions.push('- Maintain professional tone and clarity');
    instructions.push('- Do NOT simply repeat the previous response');

    return instructions.join('\n');
  }

  /**
   * Extract processing history summary
   */
  static getProcessingHistorySummary(state: typeof WorkflowStateAnnotation.State): string {
    if (!state.processing_history || state.processing_history.length === 0) {
      return '';
    }

    const steps = state.processing_history.map((step, index) => {
      const status = step.success ? '✓' : '✗';
      const time = step.output.processing_time || 0;
      return `${index + 1}. ${status} ${step.agent_name} (${step.step_name}) - ${time}ms`;
    });

    return `\n**Processing History:**\n${steps.join('\n')}`;
  }
}
