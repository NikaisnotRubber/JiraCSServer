import { WorkflowStateAnnotation } from '../workflow/state';

/**
 * Mock Quality Evaluator Agent
 *
 * Bypasses OpenAI API calls and provides simulated quality evaluation
 * for testing workflow logic without external dependencies.
 */
export class MockQualityEvaluatorAgent {
  private readonly QUALITY_THRESHOLD = 0.7;

  async evaluate(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('[MOCK MODE] Evaluating response quality...');

    // Simulate evaluation delay
    await this.simulateDelay(300);

    if (!state.current_response) {
      console.error('[MOCK MODE] No response to evaluate');
      return {
        has_error: true,
        error_message: 'No response available for quality evaluation',
        next_action: 'error',
      };
    }

    // Perform mock quality evaluation
    const qualityScore = this.calculateMockQualityScore(state);
    const feedback = this.generateMockFeedback(state, qualityScore);

    console.log(`[MOCK MODE] Quality Score: ${qualityScore}`);
    console.log(`[MOCK MODE] Pass Threshold: ${qualityScore >= this.QUALITY_THRESHOLD}`);

    // Determine next action based on quality score
    const shouldImprove = qualityScore < this.QUALITY_THRESHOLD && state.retry_count < state.max_retries;

    return {
      quality_score: qualityScore,
      quality_feedback: feedback,
      next_action: shouldImprove ? 'improve_response' : 'finalize_response',
      processing_history: [
        {
          step_name: 'quality_evaluation',
          agent_name: 'MockQualityEvaluatorAgent',
          timestamp: new Date().toISOString(),
          input: {
            response_content: state.current_response,
            original_request: state.original_request,
          },
          output: {
            confidence: qualityScore,
            suggested_action: shouldImprove ? 'improve' : 'finalize',
            response_content: feedback,
            metadata: {
              quality_score: qualityScore,
              threshold: this.QUALITY_THRESHOLD,
              passed: !shouldImprove,
              feedback: feedback,
              mock_mode: true,
            },
          },
          success: true,
        },
      ],
    };
  }

  /**
   * Calculate mock quality score based on response characteristics
   */
  private calculateMockQualityScore(state: typeof WorkflowStateAnnotation.State): number {
    if (!state.current_response) return 0;

    let score = 0.5; // Base score

    // Check response length (longer responses generally indicate more detail)
    const responseLength = state.current_response.length;
    if (responseLength > 200) score += 0.2;
    if (responseLength > 500) score += 0.1;

    // Check if response contains key phrases indicating helpfulness
    const helpfulIndicators = [
      '步驟', '請', '可以', '方法', '建議', '指南', '說明',
      '確認', '檢查', '聯繫', '協助', '解決', '處理'
    ];

    const containsHelpfulPhrases = helpfulIndicators.some(indicator =>
      state.current_response!.includes(indicator)
    );
    if (containsHelpfulPhrases) score += 0.15;

    // Check if response addresses the classification category
    if (state.classification) {
      const category = state.classification.category;
      if (category === 'JIRA_SIMPLE' && state.current_response.includes('登入')) {
        score += 0.1;
      } else if (category === 'JIRA_COMPLEX') {
        score += 0.1;
      } else if (category === 'GENERAL') {
        score += 0.1;
      }
    }

    // Ensure score is within [0, 1]
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Generate mock feedback based on quality score
   */
  private generateMockFeedback(
    state: typeof WorkflowStateAnnotation.State,
    score: number
  ): string {
    if (score >= 0.9) {
      return '[MOCK] 回覆質量優秀：回應清晰、完整且具有針對性，完全滿足客戶需求。';
    }

    if (score >= 0.8) {
      return '[MOCK] 回覆質量良好：回應準確且有幫助，略可增加更多具體細節。';
    }

    if (score >= this.QUALITY_THRESHOLD) {
      return '[MOCK] 回覆質量合格：回應基本滿足需求，可考慮補充更多資訊或範例。';
    }

    if (score >= 0.5) {
      return '[MOCK] 回覆質量需要改善：建議增加更具體的解決步驟，提供更詳細的說明，並確保回應直接針對問題。';
    }

    return '[MOCK] 回覆質量不足：回應過於簡略或未充分解決問題，需要大幅改進內容的完整性和針對性。';
  }

  /**
   * Simulate processing delay
   */
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
