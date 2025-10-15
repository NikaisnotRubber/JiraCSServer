import OpenAI from 'openai';
import { config } from '../utils/config';
import { QualityAssessment, QualityAssessmentSchema, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';
import { qualityEvaluatorTemplate } from '../prompts/templates/quality-evaluator.template';
import { PromptBuilder } from '../prompts/builders/prompt-builder';

/**
 * Quality Evaluator Agent V2
 *
 * Refactored to use the new Prompt Engineering system with:
 * - State-aware evaluation
 * - Detailed logging for debugging
 * - Context-aware quality criteria
 * - Better handling of retry scenarios
 */
export class QualityEvaluatorAgentV2 {
  private openai: OpenAI;

  constructor() {
    console.log('🔧 [QualityEvaluatorV2] Initializing with Prompt Engineering system...');

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });

    console.log('✅ [QualityEvaluatorV2] Initialized');
  }

  async evaluate(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log('🎯 [QualityEvaluatorV2] Starting Quality Evaluation');
    console.log('='.repeat(80));

    // Detailed state logging
    this.logCurrentState(state);

    try {
      if (!state.current_response) {
        throw new Error('No response to evaluate');
      }

      // Log pre-evaluation context
      this.logEvaluationContext(state);

      const assessment = await this.performQualityAssessment(state);
      const processingTime = Date.now() - startTime;

      // Log assessment details
      this.logAssessment(assessment, state);

      const processingStep: ProcessingStep = {
        step_name: 'quality_evaluation',
        agent_name: 'QualityEvaluatorAgentV2',
        timestamp: new Date().toISOString(),
        input: {
          response_content: state.current_response.substring(0, 200) + '...',
          original_request_summary: state.original_request.forms.Summary,
          classification: state.classification?.category,
          retry_count: state.retry_count,
          response_full_length: state.current_response.length,
        },
        output: {
          confidence: assessment.score / 100,
          suggested_action: assessment.requires_improvement ? 'improve_response' : 'finalize_response',
          response_content: assessment.feedback,
          metadata: {
            quality_score: assessment.score,
            quality_criteria: assessment.criteria,
            improvement_suggestions: assessment.improvement_suggestions,
            requires_improvement: assessment.requires_improvement,
          },
          processing_time: processingTime,
        },
        success: true,
      };

      // Determine next action based on assessment
      const nextAction = this.determineNextAction(assessment, state);

      console.log('\n📊 [QualityEvaluatorV2] Evaluation Summary:');
      console.log(`   Overall Score: ${assessment.score}/100`);
      console.log(`   Requires Improvement: ${assessment.requires_improvement}`);
      console.log(`   Next Action: ${nextAction}`);
      console.log(`   Current Retry: ${state.retry_count}/${state.max_retries}`);
      console.log('='.repeat(80) + '\n');

      return {
        quality_assessment: assessment,
        quality_score: assessment.score,
        quality_feedback: assessment.feedback,
        processing_history: [processingStep],
        current_agent: 'QualityEvaluatorAgentV2',
        next_action: nextAction,
        // Increment retry count if improvement needed
        retry_count: assessment.requires_improvement ? state.retry_count + 1 : state.retry_count,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      console.error('\n❌ [QualityEvaluatorV2] Evaluation Failed');
      console.error('   Error:', error instanceof Error ? error.message : String(error));
      console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('='.repeat(80) + '\n');

      const errorStep: ProcessingStep = {
        step_name: 'quality_evaluation',
        agent_name: 'QualityEvaluatorAgentV2',
        timestamp: new Date().toISOString(),
        input: {
          response_content: state.current_response || '',
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_quality_evaluation',
          response_content: 'Quality evaluation failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `Quality evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async performQualityAssessment(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<QualityAssessment> {
    console.log('🔍 [QualityEvaluatorV2] Preparing evaluation input...');

    // Prepare comprehensive input for template
    const input = {
      original_issue: {
        summary: state.original_request.forms.Summary,
        content: state.original_request.forms.Comment.Content,
      },
      response_to_evaluate: state.current_response,
      issue_category: state.classification?.category || 'Unknown',
      classification_confidence: state.classification?.confidence || 0,
      classification_reasoning: state.classification?.reasoning || 'N/A',
      retry_context: state.retry_count > 0 ? {
        retry_count: state.retry_count,
        previous_feedback: state.quality_feedback,
        previous_score: state.quality_score,
      } : undefined,
    };

    console.log('📄 [QualityEvaluatorV2] Input prepared:');
    console.log(`   Issue Category: ${input.issue_category}`);
    console.log(`   Classification Confidence: ${(input.classification_confidence * 100).toFixed(1)}%`);
    console.log(`   Response Length: ${state.current_response?.length || 0} chars`);
    console.log(`   Is Retry: ${state.retry_count > 0}`);
    if (state.retry_count > 0) {
      console.log(`   Previous Score: ${state.quality_score || 'N/A'}`);
      console.log(`   Previous Feedback Preview: ${state.quality_feedback?.substring(0, 100) || 'N/A'}...`);
    }

    // Build prompts with context
    const builtPrompt = PromptBuilder.build(
      qualityEvaluatorTemplate,
      state,
      input,
      {
        contextOptions: {
          mode: 'minimal',  // Quality eval doesn't need full KB
          includeExamples: true,  // Include response pattern examples for reference
          includeTroubleshooting: false,
          includeTechnicalProcedures: false,
        },
        maxContextTokens: 3000,
        includeStateSummary: true,  // Include workflow context
        includeRetryInstructions: false,  // Quality evaluator doesn't need retry instructions
      }
    );

    const validation = PromptBuilder.validate(builtPrompt);
    if (!validation.valid) {
      console.error('❌ [QualityEvaluatorV2] Prompt validation failed:', validation.errors);
      throw new Error(`Prompt validation failed: ${validation.errors.join(', ')}`);
    }

    console.log('📊 [QualityEvaluatorV2] Prompt built successfully');
    console.log(`   Estimated tokens: ${builtPrompt.metadata.estimatedTokens}`);

    // Log full prompts for debugging (truncated if too long)
    this.logPromptDetails(builtPrompt);

    console.log('🌐 [QualityEvaluatorV2] Calling OpenAI API for quality assessment...');

    const response = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: builtPrompt.systemPrompt },
        { role: 'user', content: builtPrompt.userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'quality_assessment',
          schema: QualityAssessmentSchema,
        },
      },
      temperature: 0.2,  // Slightly higher for more nuanced evaluation
    });

    console.log('✅ [QualityEvaluatorV2] OpenAI API call successful');

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No quality assessment received from OpenAI');
    }

    console.log('📝 [QualityEvaluatorV2] Raw assessment result (first 500 chars):');
    console.log(result.substring(0, 500) + (result.length > 500 ? '...' : ''));

    const assessment = JSON.parse(result) as QualityAssessment;

    // Validate and adjust assessment
    this.validateAndAdjustAssessment(assessment, state);

    return assessment;
  }

  private determineNextAction(
    assessment: QualityAssessment,
    state: typeof WorkflowStateAnnotation.State
  ): string {
    // If quality is good, finalize
    if (!assessment.requires_improvement && assessment.score >= 75) {
      console.log('✅ [QualityEvaluatorV2] Quality acceptable, will finalize');
      return 'finalize_response';
    }

    // If already at max retries, proceed anyway
    if (state.retry_count >= state.max_retries) {
      console.log(`⚠️  [QualityEvaluatorV2] Max retries (${state.max_retries}) reached, will finalize anyway`);
      return 'finalize_response';
    }

    // Need improvement and have retries left
    console.log(`🔄 [QualityEvaluatorV2] Quality below threshold (${assessment.score}/100), will retry`);
    return 'improve_response';
  }

  private validateAndAdjustAssessment(assessment: QualityAssessment, state: typeof WorkflowStateAnnotation.State): void {
    // Clamp scores to valid range
    if (assessment.score < 0 || assessment.score > 100) {
      console.warn(`⚠️  [QualityEvaluatorV2] Invalid score: ${assessment.score}, clamping to 0-100`);
      assessment.score = Math.max(0, Math.min(100, assessment.score));
    }

    // Validate criteria
    const criteria = assessment.criteria;
    for (const [key, value] of Object.entries(criteria)) {
      if (value < 0 || value > 100) {
        console.warn(`⚠️  [QualityEvaluatorV2] Invalid ${key} score: ${value}, clamping`);
        (criteria as any)[key] = Math.max(0, Math.min(100, value));
      }
    }

    // Adaptive quality threshold based on retry count
    // First attempt: strict (75), subsequent attempts: more lenient
    const qualityThreshold = state.retry_count === 0 ? 75 : Math.max(65, 75 - (state.retry_count * 5));

    console.log(`📏 [QualityEvaluatorV2] Quality threshold for this evaluation: ${qualityThreshold}`);

    // Adjust requires_improvement based on adaptive threshold
    if (assessment.score < qualityThreshold) {
      if (!assessment.requires_improvement) {
        console.warn(`⚠️  [QualityEvaluatorV2] Score ${assessment.score} < threshold ${qualityThreshold} but requires_improvement=false, correcting`);
        assessment.requires_improvement = true;
      }
    } else {
      // Score meets threshold
      if (assessment.requires_improvement && assessment.score >= qualityThreshold) {
        console.warn(`⚠️  [QualityEvaluatorV2] Score ${assessment.score} >= threshold ${qualityThreshold} but requires_improvement=true, correcting`);
        assessment.requires_improvement = false;
      }
    }

    // Special case: if we're at or near max retries and score is reasonable (>60), accept it
    if (state.retry_count >= state.max_retries - 1 && assessment.score >= 60) {
      console.warn(`⚠️  [QualityEvaluatorV2] Near max retries (${state.retry_count}/${state.max_retries}), accepting score ${assessment.score}`);
      assessment.requires_improvement = false;
    }
  }

  private logCurrentState(state: typeof WorkflowStateAnnotation.State): void {
    console.log('\n📋 [QualityEvaluatorV2] Current Workflow State:');
    console.log(`   Workflow ID: ${state.workflow_id}`);
    console.log(`   Current Agent: ${state.current_agent}`);
    console.log(`   Retry Count: ${state.retry_count}/${state.max_retries}`);
    console.log(`   Has Error: ${state.has_error}`);

    if (state.classification) {
      console.log(`\n   Classification:`);
      console.log(`     Category: ${state.classification.category}`);
      console.log(`     Confidence: ${(state.classification.confidence * 100).toFixed(1)}%`);
      console.log(`     Reasoning: ${state.classification.reasoning}`);
    }

    if (state.current_response) {
      console.log(`\n   Current Response:`);
      console.log(`     Length: ${state.current_response.length} characters`);
      console.log(`     Preview: ${state.current_response.substring(0, 150)}...`);
    }

    if (state.quality_feedback) {
      console.log(`\n   Previous Quality Feedback:`);
      console.log(`     ${state.quality_feedback}`);
    }

    if (state.processing_history && state.processing_history.length > 0) {
      console.log(`\n   Processing History: ${state.processing_history.length} steps`);
      state.processing_history.forEach((step: ProcessingStep, idx: number) => {
        console.log(`     ${idx + 1}. ${step.agent_name} (${step.step_name}) - ${step.success ? '✓' : '✗'}`);
      });
    }
  }

  private logEvaluationContext(state: typeof WorkflowStateAnnotation.State): void {
    console.log('\n🔍 [QualityEvaluatorV2] Evaluation Context:');
    console.log(`   Original Issue Summary: ${state.original_request.forms.Summary}`);
    console.log(`   Original Issue Content Length: ${state.original_request.forms.Comment.Content.length} chars`);
    console.log(`   Generated Response Length: ${state.current_response?.length || 0} chars`);

    if (state.retry_count > 0) {
      console.log(`\n   ⚠️  This is a RETRY evaluation (attempt #${state.retry_count + 1})`);
      console.log(`   Previous Score: ${state.quality_score || 'N/A'}`);
      if (state.quality_assessment) {
        console.log(`   Previous Criteria Scores:`);
        console.log(`     - Relevance: ${state.quality_assessment.criteria.relevance}`);
        console.log(`     - Completeness: ${state.quality_assessment.criteria.completeness}`);
        console.log(`     - Tone: ${state.quality_assessment.criteria.tone}`);
        console.log(`     - Actionability: ${state.quality_assessment.criteria.actionability}`);
        console.log(`     - Accuracy: ${state.quality_assessment.criteria.accuracy}`);
      }
    }
  }

  private logPromptDetails(builtPrompt: any): void {
    console.log('\n📝 [QualityEvaluatorV2] Prompt Details:');
    console.log(`   System Prompt Length: ${builtPrompt.systemPrompt.length} chars`);
    console.log(`   User Prompt Length: ${builtPrompt.userPrompt.length} chars`);
    console.log(`   Total Estimated Tokens: ${builtPrompt.metadata.estimatedTokens}`);
    console.log(`   Is Retry: ${builtPrompt.metadata.isRetry}`);

    // Log first 300 chars of system prompt
    console.log('\n   System Prompt Preview:');
    console.log('   ' + builtPrompt.systemPrompt.substring(0, 300).replace(/\n/g, '\n   ') + '...');

    // Log first 400 chars of user prompt
    console.log('\n   User Prompt Preview:');
    console.log('   ' + builtPrompt.userPrompt.substring(0, 400).replace(/\n/g, '\n   ') + '...');
  }

  private logAssessment(assessment: QualityAssessment, state: typeof WorkflowStateAnnotation.State): void {
    console.log('\n📊 [QualityEvaluatorV2] Assessment Results:');
    console.log(`   Overall Score: ${assessment.score}/100`);
    console.log(`   Requires Improvement: ${assessment.requires_improvement}`);

    console.log('\n   Criteria Breakdown:');
    console.log(`     Relevance:     ${assessment.criteria.relevance}/100`);
    console.log(`     Completeness:  ${assessment.criteria.completeness}/100`);
    console.log(`     Tone:          ${assessment.criteria.tone}/100`);
    console.log(`     Actionability: ${assessment.criteria.actionability}/100`);
    console.log(`     Accuracy:      ${assessment.criteria.accuracy}/100`);

    console.log('\n   Feedback:');
    console.log(`     ${assessment.feedback}`);

    if (assessment.improvement_suggestions.length > 0) {
      console.log('\n   Improvement Suggestions:');
      assessment.improvement_suggestions.forEach((suggestion, idx) => {
        console.log(`     ${idx + 1}. ${suggestion}`);
      });
    }
  }

  // Helper method to determine if response needs improvement
  static needsImprovement(assessment: QualityAssessment): boolean {
    return assessment.requires_improvement || assessment.score < 75;
  }

  // Helper method to get quality summary
  static getQualitySummary(assessment: QualityAssessment): string {
    if (assessment.score >= 90) return 'Excellent';
    if (assessment.score >= 75) return 'Good';
    if (assessment.score >= 60) return 'Acceptable';
    return 'Needs Improvement';
  }
}
