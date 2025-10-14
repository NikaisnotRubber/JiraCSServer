import { ClassificationResult, JiraIssueInput, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';

/**
 * Mock Problem Classification Agent
 * Used for testing without external API dependencies
 */
export class MockProblemClassificationAgent {
  async classify(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    console.log('[MOCK MODE] Classifying problem...');

    // Simulate processing delay
    await this.simulateDelay(500);

    const classification = this.performMockClassification(request);
    const processingTime = Date.now() - startTime;

    const processingStep: ProcessingStep = {
      step_name: 'classification',
      agent_name: 'MockProblemClassificationAgent',
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
          mock_mode: true,
        },
        processing_time: processingTime,
      },
      success: true,
    };

    console.log(`[MOCK MODE] Classification: ${classification.category} (confidence: ${classification.confidence})`);

    return {
      classification,
      processing_history: [processingStep],
      current_agent: 'MockProblemClassificationAgent',
      next_action: this.determineNextAction(classification),
    };
  }

  private performMockClassification(request: JiraIssueInput): ClassificationResult {
    const summary = request.forms.Summary.toLowerCase();
    const content = request.forms.Comment.Content.toLowerCase();
    const fullText = `${summary} ${content}`;

    // Simple keyword-based classification
    if (fullText.includes('登入') || fullText.includes('login') || fullText.includes('密碼') || fullText.includes('password')) {
      return {
        category: 'JIRA_SIMPLE',
        confidence: 0.92,
        reasoning: '[MOCK] Detected login-related issue based on keywords',
        key_indicators: ['login', 'password', 'authentication'],
      };
    }

    if (fullText.includes('權限') || fullText.includes('permission') || fullText.includes('access')) {
      return {
        category: 'JIRA_COMPLEX',
        confidence: 0.88,
        reasoning: '[MOCK] Detected permission/access issue requiring complex handling',
        key_indicators: ['permission', 'access', 'authorization'],
      };
    }

    if (fullText.includes('欄位') || fullText.includes('field') || fullText.includes('workflow') || fullText.includes('工作流')) {
      return {
        category: 'JIRA_COMPLEX',
        confidence: 0.90,
        reasoning: '[MOCK] Detected configuration issue (field or workflow)',
        key_indicators: ['field', 'workflow', 'configuration'],
      };
    }

    // Default to GENERAL for consultation, wish pool, etc.
    return {
      category: 'GENERAL',
      confidence: 0.85,
      reasoning: '[MOCK] General inquiry or consultation request',
      key_indicators: ['general', 'consultation'],
    };
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

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
