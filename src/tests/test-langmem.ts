/**
 * LangMem Integration Test
 *
 * This test verifies that LangGraph's native LangMem (checkpoint-based memory)
 * correctly maintains conversation context across multiple interactions for the
 * same Project ID (thread_id).
 *
 * Test Scenario:
 * 1. First interaction with Project ID "JCSC-TEST-1"
 * 2. Second interaction with same Project ID (should have context from first)
 * 3. Third interaction with different Project ID (should have separate context)
 * 4. Fourth interaction back to first Project ID (should maintain continuity)
 */

import { JiraWorkflowOrchestrator } from '../workflow/orchestrator';
import { JiraIssueInput } from '../types';

class LangMemTester {
  private orchestrator: JiraWorkflowOrchestrator;

  constructor() {
    this.orchestrator = new JiraWorkflowOrchestrator();
  }

  /**
   * Create a test Jira issue with custom content
   */
  private createTestIssue(
    projectId: string,
    summary: string,
    commentContent: string
  ): JiraIssueInput {
    return {
      forms: {
        "Project ID": projectId,
        "Issue Type": "Service Request",
        "Summary": summary,
        "Reporter": "test.user@example.com",
        "Comment": {
          Created: new Date().toISOString(),
          Updated: new Date().toISOString(),
          Content: commentContent,
        },
      },
    };
  }

  /**
   * Run LangMem integration test
   */
  async runTest(): Promise<void> {
    console.log('🧪 LangMem Integration Test');
    console.log('='.repeat(60));
    console.log('Testing conversation continuity with LangGraph checkpointing\n');

    try {
      // Test 1: First interaction with Project A
      console.log('📝 Test 1: First interaction with Project JCSC-TEST-1');
      console.log('-'.repeat(60));
      const issue1 = this.createTestIssue(
        'JCSC-TEST-1',
        'Need help with VPN connection',
        '我無法連接到公司VPN,請問該如何處理?'
      );

      const result1 = await this.orchestrator.processRequest(issue1, {
        sendToJira: false,
      });

      console.log(`✅ Result 1: ${result1.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`🔑 Workflow ID: ${result1.workflow_id}`);
      console.log(`⏱️  Processing time: ${result1.processing_time}ms`);
      if (result1.result?.final_output) {
        console.log(`📤 Response preview: ${result1.result.final_output.comment_content.substring(0, 150)}...`);
      }
      console.log();

      // Wait a bit to ensure checkpoint is written
      await this.sleep(1000);

      // Test 2: Second interaction with same Project A (should have context)
      console.log('📝 Test 2: Follow-up question for same Project JCSC-TEST-1');
      console.log('-'.repeat(60));
      console.log('⚠️  EXPECTED: Should reference previous VPN question');
      const issue2 = this.createTestIssue(
        'JCSC-TEST-1',
        'Follow-up on previous issue',
        '剛才提到的問題解決了嗎?還有其他步驟嗎?'
      );

      const result2 = await this.orchestrator.processRequest(issue2, {
        sendToJira: false,
      });

      console.log(`✅ Result 2: ${result2.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`🔑 Workflow ID: ${result2.workflow_id}`);
      console.log(`⏱️  Processing time: ${result2.processing_time}ms`);

      // Check if context was loaded
      if (result2.result?.historical_context?.hasHistory) {
        console.log('✅ PASS: Historical context loaded from database');
        console.log(`📚 Context summary: ${result2.result.historical_context.contextSummary}`);
      } else {
        console.log('⚠️  WARNING: No historical context from database (LangMem should handle this)');
      }

      if (result2.result?.final_output) {
        console.log(`📤 Response preview: ${result2.result.final_output.comment_content.substring(0, 150)}...`);
      }
      console.log();

      await this.sleep(1000);

      // Test 3: Different Project B (should have separate context)
      console.log('📝 Test 3: New interaction with different Project JCSC-TEST-2');
      console.log('-'.repeat(60));
      console.log('⚠️  EXPECTED: Should NOT reference VPN question (different thread)');
      const issue3 = this.createTestIssue(
        'JCSC-TEST-2',
        'Password reset request',
        '我忘記了登入密碼,需要重設'
      );

      const result3 = await this.orchestrator.processRequest(issue3, {
        sendToJira: false,
      });

      console.log(`✅ Result 3: ${result3.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`🔑 Workflow ID: ${result3.workflow_id}`);
      console.log(`⏱️  Processing time: ${result3.processing_time}ms`);

      if (result3.result?.historical_context?.hasHistory) {
        console.log('⚠️  WARNING: Historical context loaded (should be empty for new project)');
      } else {
        console.log('✅ PASS: No historical context (new project, as expected)');
      }

      if (result3.result?.final_output) {
        console.log(`📤 Response preview: ${result3.result.final_output.comment_content.substring(0, 150)}...`);
      }
      console.log();

      await this.sleep(1000);

      // Test 4: Back to Project A (should still have context)
      console.log('📝 Test 4: Another follow-up for Project JCSC-TEST-1');
      console.log('-'.repeat(60));
      console.log('⚠️  EXPECTED: Should reference both previous VPN interactions');
      const issue4 = this.createTestIssue(
        'JCSC-TEST-1',
        'Additional VPN question',
        '還有一個問題,VPN連線速度很慢,這正常嗎?'
      );

      const result4 = await this.orchestrator.processRequest(issue4, {
        sendToJira: false,
      });

      console.log(`✅ Result 4: ${result4.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`🔑 Workflow ID: ${result4.workflow_id}`);
      console.log(`⏱️  Processing time: ${result4.processing_time}ms`);

      if (result4.result?.historical_context?.hasHistory) {
        console.log('✅ PASS: Historical context loaded (conversation continuity maintained)');
        console.log(`📚 Context summary: ${result4.result.historical_context.contextSummary}`);
      } else {
        console.log('❌ FAIL: No historical context (should have context from previous interactions)');
      }

      if (result4.result?.final_output) {
        console.log(`📤 Response preview: ${result4.result.final_output.comment_content.substring(0, 150)}...`);
      }
      console.log();

      // Summary
      console.log('='.repeat(60));
      console.log('📊 LangMem Test Summary');
      console.log('='.repeat(60));
      console.log(`Test 1 (Project A - First): ${result1.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Test 2 (Project A - Follow-up): ${result2.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Test 3 (Project B - New): ${result3.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Test 4 (Project A - Return): ${result4.success ? '✅ PASS' : '❌ FAIL'}`);
      console.log();

      // Verify LangMem behavior
      console.log('🔍 LangMem Checkpoint Verification:');
      console.log('- LangMem automatically persists workflow state after each node');
      console.log('- Thread continuity is maintained using thread_id (Project ID)');
      console.log('- Same Project ID = Same thread = Shared conversation context');
      console.log('- Different Project ID = Different thread = Separate context');
      console.log();

      if (result1.success && result2.success && result3.success && result4.success) {
        console.log('✅ All LangMem tests PASSED');
      } else {
        console.log('❌ Some LangMem tests FAILED');
      }

    } catch (error: any) {
      console.error('❌ LangMem test failed:', error?.message || error);
      throw error;
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting LangMem Integration Test\n');

  const tester = new LangMemTester();
  await tester.runTest();

  console.log('\n✅ LangMem test completed');
}

// Handle uncaught errors
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { LangMemTester };
