import { WorkflowStateAnnotation } from '../workflow/state';

/**
 * Workflow Logger Utility
 *
 * Provides detailed logging for workflow state transitions and debugging
 */

export class WorkflowLogger {
  private static readonly SEPARATOR = '='.repeat(100);
  private static readonly SUB_SEPARATOR = '-'.repeat(100);

  /**
   * Log workflow state entry
   */
  static logStateEntry(nodeName: string, state: typeof WorkflowStateAnnotation.State): void {
    console.log('\n' + this.SEPARATOR);
    console.log(`🚀 ENTERING NODE: ${nodeName}`);
    console.log(this.SEPARATOR);

    console.log('\n📊 Workflow Metrics:');
    console.log(`   Workflow ID:     ${state.workflow_id || 'N/A'}`);
    console.log(`   Current Agent:   ${state.current_agent || 'None'}`);
    console.log(`   Retry Count:     ${state.retry_count || 0}/${state.max_retries || 3}`);
    console.log(`   Has Error:       ${state.has_error || false}`);
    console.log(`   Next Action:     ${state.next_action || 'None'}`);

    if (state.started_at) {
      const elapsed = Date.now() - new Date(state.started_at).getTime();
      console.log(`   Elapsed Time:    ${elapsed}ms`);
    }

    console.log('\n📝 Request Info:');
    if (state.original_request) {
      console.log(`   Project ID:      ${state.original_request.forms['Project ID']}`);
      console.log(`   Issue Type:      ${state.original_request.forms['Issue Type']}`);
      console.log(`   Reporter:        ${state.original_request.forms.Reporter}`);
      console.log(`   Summary:         ${state.original_request.forms.Summary.substring(0, 80)}...`);
    }

    if (state.classification) {
      console.log('\n🏷️  Classification:');
      console.log(`   Category:        ${state.classification.category}`);
      console.log(`   Confidence:      ${(state.classification.confidence * 100).toFixed(1)}%`);
      console.log(`   Reasoning:       ${state.classification.reasoning.substring(0, 100)}...`);
    }

    if (state.current_response) {
      console.log('\n💬 Current Response:');
      console.log(`   Length:          ${state.current_response.length} characters`);
      console.log(`   Preview:         ${state.current_response.substring(0, 100)}...`);
    }

    if (state.quality_score !== undefined) {
      console.log('\n⭐ Quality Metrics:');
      console.log(`   Score:           ${state.quality_score}/100`);
      if (state.quality_feedback) {
        console.log(`   Feedback:        ${state.quality_feedback.substring(0, 80)}...`);
      }
    }

    if (state.processing_history && state.processing_history.length > 0) {
      console.log('\n📜 Processing History:');
      state.processing_history.forEach((step, idx) => {
        const status = step.success ? '✅' : '❌';
        const time = step.output.processing_time || 0;
        console.log(`   ${idx + 1}. ${status} ${step.agent_name.padEnd(30)} [${step.step_name}] (${time}ms)`);
        if (!step.success && step.error) {
          console.log(`      Error: ${step.error}`);
        }
      });
    }

    if (state.error_message) {
      console.log('\n❌ Error Details:');
      console.log(`   ${state.error_message}`);
    }

    console.log('\n' + this.SUB_SEPARATOR + '\n');
  }

  /**
   * Log state exit
   */
  static logStateExit(
    nodeName: string,
    updates: Partial<typeof WorkflowStateAnnotation.State>,
    duration: number
  ): void {
    console.log('\n' + this.SUB_SEPARATOR);
    console.log(`✅ EXITING NODE: ${nodeName} (${duration}ms)`);
    console.log(this.SUB_SEPARATOR);

    console.log('\n🔄 State Updates:');

    if (updates.classification) {
      console.log(`   ✓ Classification: ${updates.classification.category} (${(updates.classification.confidence * 100).toFixed(1)}%)`);
    }

    if (updates.current_response) {
      console.log(`   ✓ Response Generated: ${updates.current_response.length} chars`);
    }

    if (updates.quality_score !== undefined) {
      console.log(`   ✓ Quality Score: ${updates.quality_score}/100`);
    }

    if (updates.quality_assessment) {
      console.log(`   ✓ Quality Assessment: ${updates.quality_assessment.requires_improvement ? 'Needs Improvement' : 'Acceptable'}`);
    }

    if (updates.next_action) {
      console.log(`   ✓ Next Action: ${updates.next_action}`);
    }

    if (updates.retry_count !== undefined) {
      console.log(`   ✓ Retry Count: ${updates.retry_count}`);
    }

    if (updates.current_agent) {
      console.log(`   ✓ Current Agent: ${updates.current_agent}`);
    }

    if (updates.has_error) {
      console.log(`   ❌ Error Occurred: ${updates.error_message || 'Unknown error'}`);
    }

    if (updates.final_output) {
      console.log(`   ✓ Final Output Ready: ${updates.final_output.issue_key}`);
    }

    if (updates.processing_history && updates.processing_history.length > 0) {
      console.log(`   ✓ Processing Steps Added: ${updates.processing_history.length}`);
    }

    console.log('\n' + this.SEPARATOR + '\n');
  }

  /**
   * Log routing decision
   */
  static logRoutingDecision(
    fromNode: string,
    toNode: string,
    reason: string,
    state: typeof WorkflowStateAnnotation.State
  ): void {
    console.log('\n🔀 ROUTING DECISION:');
    console.log(`   From:            ${fromNode}`);
    console.log(`   To:              ${toNode}`);
    console.log(`   Reason:          ${reason}`);
    console.log(`   Retry Count:     ${state.retry_count || 0}/${state.max_retries || 3}`);
    console.log(`   Next Action:     ${state.next_action || 'None'}`);
    console.log('');
  }

  /**
   * Log prompt building details
   */
  static logPromptBuilding(
    agentName: string,
    templateId: string,
    estimatedTokens: number,
    isRetry: boolean
  ): void {
    console.log('\n📝 Prompt Building:');
    console.log(`   Agent:           ${agentName}`);
    console.log(`   Template:        ${templateId}`);
    console.log(`   Estimated Tokens: ${estimatedTokens}`);
    console.log(`   Is Retry:        ${isRetry}`);
  }

  /**
   * Log API call
   */
  static logAPICall(agentName: string, model: string, action: string): void {
    console.log(`\n🌐 [${agentName}] Calling OpenAI API...`);
    console.log(`   Model:           ${model}`);
    console.log(`   Action:          ${action}`);
  }

  /**
   * Log API response
   */
  static logAPIResponse(agentName: string, success: boolean, duration: number, error?: string): void {
    if (success) {
      console.log(`✅ [${agentName}] API call successful (${duration}ms)`);
    } else {
      console.log(`❌ [${agentName}] API call failed (${duration}ms)`);
      if (error) {
        console.log(`   Error: ${error}`);
      }
    }
  }

  /**
   * Log context assembly
   */
  static logContextAssembly(
    mode: string,
    keywords: string[],
    includedContexts: string[]
  ): void {
    console.log('\n🧩 Context Assembly:');
    console.log(`   Mode:            ${mode}`);
    console.log(`   Keywords:        ${keywords.join(', ')}`);
    console.log(`   Included:        ${includedContexts.join(', ')}`);
  }

  /**
   * Log workflow summary
   */
  static logWorkflowSummary(state: typeof WorkflowStateAnnotation.State): void {
    console.log('\n' + this.SEPARATOR);
    console.log('📊 WORKFLOW SUMMARY');
    console.log(this.SEPARATOR);

    console.log('\n⏱️  Timing:');
    if (state.started_at && state.completed_at) {
      const duration = new Date(state.completed_at).getTime() - new Date(state.started_at).getTime();
      console.log(`   Total Duration:  ${duration}ms`);
    }

    if (state.processing_history) {
      const totalProcessingTime = state.processing_history.reduce(
        (sum, step) => sum + (step.output.processing_time || 0),
        0
      );
      console.log(`   Processing Time: ${totalProcessingTime}ms`);
      console.log(`   Total Steps:     ${state.processing_history.length}`);
    }

    console.log('\n📈 Results:');
    console.log(`   Final Status:    ${state.has_error ? '❌ Failed' : '✅ Success'}`);
    console.log(`   Retry Count:     ${state.retry_count || 0}`);

    if (state.quality_score) {
      console.log(`   Quality Score:   ${state.quality_score}/100`);
    }

    if (state.final_output) {
      console.log(`   Issue Key:       ${state.final_output.issue_key}`);
      console.log(`   Response Length: ${state.final_output.comment_content.length} chars`);
    }

    console.log('\n' + this.SEPARATOR + '\n');
  }

  /**
   * Log error details
   */
  static logError(agentName: string, error: Error | unknown, context?: any): void {
    console.log('\n' + this.SEPARATOR);
    console.log(`❌ ERROR in ${agentName}`);
    console.log(this.SEPARATOR);

    if (error instanceof Error) {
      console.log(`\n   Name:    ${error.name}`);
      console.log(`   Message: ${error.message}`);
      if (error.stack) {
        console.log(`\n   Stack Trace:`);
        console.log(error.stack.split('\n').map(line => `   ${line}`).join('\n'));
      }
    } else {
      console.log(`\n   Error: ${String(error)}`);
    }

    if (context) {
      console.log(`\n   Context:`);
      console.log(JSON.stringify(context, null, 2).split('\n').map(line => `   ${line}`).join('\n'));
    }

    console.log('\n' + this.SEPARATOR + '\n');
  }
}
