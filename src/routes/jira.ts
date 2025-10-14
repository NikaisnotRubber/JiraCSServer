import { NextRequest, NextResponse } from 'next/server';
import { JiraWorkflowOrchestrator } from '../workflow/orchestrator';
import { JiraIssueInput } from '../types';

const orchestrator = new JiraWorkflowOrchestrator();

// ========================================
// 辅助函数
// ========================================

function successResponse(data: any) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

function errorResponse(error: string, details?: any) {
  return {
    success: false,
    error,
    details,
    timestamp: new Date().toISOString(),
  };
}

function validateJiraIssue(issue: any): { valid: boolean; error?: string } {
  if (!issue.forms) {
    return { valid: false, error: 'Missing required field: forms' };
  }

  const requiredFields = ['Project ID', 'Issue Type', 'Reporter', 'Summary', 'Comment'];
  for (const field of requiredFields) {
    if (!issue.forms[field]) {
      return { valid: false, error: `Missing required field: forms.${field}` };
    }
  }

  if (!issue.forms.Comment?.Content) {
    return { valid: false, error: 'Missing required field: forms.Comment.Content' };
  }

  return { valid: true };
}

// ========================================
// 路由处理器
// ========================================

/**
 * POST /api/jira/process
 * 处理单个 Jira 工单并发送评论到 Jira
 */
export async function processHandler(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const issue: JiraIssueInput = body;

    // 验证输入
    const validation = validateJiraIssue(issue);
    if (!validation.valid) {
      return NextResponse.json(
        errorResponse('Invalid request data', { field: validation.error }),
        { status: 400 }
      );
    }

    console.log(`🌐 API Request: Processing issue ${issue.forms["Project ID"]}`);

    // 处理工单并发送到 Jira
    const result = await orchestrator.processRequest(issue, { sendToJira: true });
    const processingTime = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ API Success: Issue ${issue.forms["Project ID"]} processed in ${processingTime}ms`);

      return NextResponse.json(
        successResponse({
          issue_key: result.result.final_output.issue_key,
          Source: result.result.final_output.Source,
          comment_content: result.result.final_output.comment_content,
          workflow_id: result.workflow_id,
          processing_time: result.processing_time,
          classification: result.result.classification,
          quality_score: result.result.quality_score,
          jira_comment_sent: true,
          processing_steps: result.result.processing_history?.map((step: any) => ({
            agent: step.agent_name,
            step: step.step_name,
            success: step.success,
            processing_time: step.output.processing_time,
          })),
        }),
        { status: 200 }
      );
    } else {
      console.log(`❌ API Error: Issue ${issue.forms["Project ID"]} failed: ${result.error}`);

      return NextResponse.json(
        errorResponse('Workflow processing failed', {
          workflow_id: result.workflow_id,
          error: result.error,
          processing_time: result.processing_time,
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ POST /api/jira/process failed:', error);

    return NextResponse.json(
      errorResponse('Processing failed', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/jira/process_test
 * 处理单个 Jira 工单但不发送评论到 Jira（测试模式）
 */
export async function processTestHandler(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const issue: JiraIssueInput = body;

    // 验证输入
    const validation = validateJiraIssue(issue);
    if (!validation.valid) {
      return NextResponse.json(
        errorResponse('Invalid request data', { field: validation.error }),
        { status: 400 }
      );
    }

    console.log(`🧪 API Test Request: Processing issue ${issue.forms["Project ID"]} (no comment will be sent)`);

    // 处理工单但不发送到 Jira
    const result = await orchestrator.processRequest(issue, { sendToJira: false });
    const processingTime = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ API Test Success: Issue ${issue.forms["Project ID"]} processed in ${processingTime}ms (comment NOT sent)`);

      return NextResponse.json(
        successResponse({
          test_mode: true,
          message: 'Processing completed successfully. Comment was NOT sent to Jira.',
          issue_key: result.result.final_output.issue_key,
          Source: result.result.final_output.Source,
          comment_content: result.result.final_output.comment_content,
          workflow_id: result.workflow_id,
          processing_time: result.processing_time,
          classification: result.result.classification,
          quality_score: result.result.quality_score,
          jira_comment_sent: false,
          processing_steps: result.result.processing_history?.map((step: any) => ({
            agent: step.agent_name,
            step: step.step_name,
            success: step.success,
            processing_time: step.output.processing_time,
          })),
        }),
        { status: 200 }
      );
    } else {
      console.log(`❌ API Test Error: Issue ${issue.forms["Project ID"]} failed: ${result.error}`);

      return NextResponse.json(
        errorResponse('Workflow processing failed', {
          test_mode: true,
          workflow_id: result.workflow_id,
          error: result.error,
          processing_time: result.processing_time,
        }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ POST /api/jira/process_test failed:', error);

    return NextResponse.json(
      errorResponse('Processing failed', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/jira/batch
 * 批量处理多个 Jira 工单
 */
export async function batchHandler(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { issues, options } = body;

    if (!Array.isArray(issues) || issues.length === 0) {
      return NextResponse.json(
        errorResponse('Invalid request data', { field: 'issues must be a non-empty array' }),
        { status: 400 }
      );
    }

    if (issues.length > 10) {
      return NextResponse.json(
        errorResponse('Batch size limit exceeded', { max_issues: 10, provided: issues.length }),
        { status: 400 }
      );
    }

    console.log(`🌐 API Batch Request: Processing ${issues.length} issues`);

    let results;

    if (options?.parallel) {
      // 并行处理
      console.log('🔄 Processing issues in parallel...');
      const promises = issues.map((issue: JiraIssueInput) =>
        orchestrator.processRequest(issue, { sendToJira: options?.sendToJira ?? true }).catch(error => ({
          success: false,
          error: error.message,
          workflow_id: `error-${Date.now()}`,
          processing_time: 0
        }))
      );

      results = await Promise.all(promises);
    } else {
      // 顺序处理
      console.log('🔄 Processing issues sequentially...');
      results = [];

      for (const issue of issues) {
        try {
          const result = await orchestrator.processRequest(issue, { sendToJira: options?.sendToJira ?? true });
          results.push(result);
        } catch (error) {
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            workflow_id: `error-${Date.now()}`,
            processing_time: 0
          });
        }
      }
    }

    const processingTime = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    console.log(`📊 Batch Complete: ${successful} success, ${failed} failed in ${processingTime}ms`);

    return NextResponse.json(
      successResponse({
        summary: {
          total: results.length,
          successful,
          failed,
          processing_time: processingTime
        },
        results: results.map((result, index) => ({
          index,
          issue_key: issues[index].forms["Project ID"],
          success: result.success,
          workflow_id: result.workflow_id,
          processing_time: result.processing_time,
          data: result.success && 'result' in result ? {
            issue_key: result.result?.final_output?.issue_key,
            Source: result.result?.final_output?.Source,
            comment_content: result.result?.final_output?.comment_content,
            classification: result.result?.classification?.category,
            quality_score: result.result?.quality_score
          } : null,
          error: !result.success && 'error' in result ? result.error : null
        }))
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ POST /api/jira/batch failed:', error);

    return NextResponse.json(
      errorResponse('Batch processing failed', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/jira/health
 * 系统健康检查
 */
export async function healthHandler(_request: NextRequest) {
  try {
    const health = await orchestrator.healthCheck();

    const response = successResponse({
      status: health.status,
      timestamp: health.timestamp,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version
    });

    const statusCode = health.status === 'healthy' ? 200 : 503;
    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      errorResponse('Health check failed', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/jira/info
 * 系统信息和限制
 */
export async function infoHandler(_request: NextRequest) {
  const response = successResponse({
    service: 'JiraCSServer',
    version: '2.0.0',
    description: 'Jira Customer Service Agent Workflow System',
    endpoints: {
      process: 'POST /api/jira/process - Process single Jira issue and send comment to Jira',
      'process_test': 'POST /api/jira/process_test - Process single Jira issue WITHOUT sending comment to Jira (test mode)',
      batch: 'POST /api/jira/batch - Process multiple issues',
      health: 'GET /api/jira/health - System health check',
      info: 'GET /api/jira/info - System information'
    },
    limits: {
      max_issues_per_batch: 10,
      max_request_size: '1MB'
    }
  });

  return NextResponse.json(response, { status: 200 });
}
