
import { StateGraph, START, END } from '@langchain/langgraph';
import { WorkflowStateAnnotation, WorkflowStateUtils } from './state';
import { ProblemClassificationAgent } from '../agents/classifier';
import { LoginHandlerAgent } from '../agents/login-handler';
import { ComplexHandlerAgent } from '../agents/complex-handler';
import { GeneralHandlerAgent } from '../agents/general-handler';
import { QualityEvaluatorAgent } from '../agents/quality-evaluator';
import { MockProblemClassificationAgent } from '../agents/mock-classifier';
import { MockLoginHandlerAgent, MockComplexHandlerAgent, MockGeneralHandlerAgent } from '../agents/mock-handlers';
import { MockQualityEvaluatorAgent } from '../agents/mock-quality-evaluator';
import { JiraApiClient } from '../clients/jira-client';
import { config } from '../utils/config';

const useMockAgents = config.app.testMode || !process.env.OPENAI_API_KEY;

let classificationAgent: ProblemClassificationAgent | MockProblemClassificationAgent;
let loginHandler: LoginHandlerAgent | MockLoginHandlerAgent;
let complexHandler: ComplexHandlerAgent | MockComplexHandlerAgent;
let generalHandler: GeneralHandlerAgent | MockGeneralHandlerAgent;
let qualityEvaluator: QualityEvaluatorAgent | MockQualityEvaluatorAgent;

if (useMockAgents) {
  console.log('🔧 [MOCK MODE] Initializing workflow with mock agents (no external API calls)');
  classificationAgent = new MockProblemClassificationAgent();
  loginHandler = new MockLoginHandlerAgent();
  complexHandler = new MockComplexHandlerAgent();
  generalHandler = new MockGeneralHandlerAgent();
  qualityEvaluator = new MockQualityEvaluatorAgent();
} else {
  console.log('🔧 Initializing workflow with real agents (OpenAI API enabled)');
  classificationAgent = new ProblemClassificationAgent();
  loginHandler = new LoginHandlerAgent();
  complexHandler = new ComplexHandlerAgent();
  generalHandler = new GeneralHandlerAgent();
  qualityEvaluator = new QualityEvaluatorAgent();
}

const jiraClient = new JiraApiClient();

// Node implementations
async function classifyNode(
  state: typeof WorkflowStateAnnotation.State
): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
  console.log('🔍 Classifying problem...');
  try {
    return await classificationAgent.classify(state);
  } catch (error: any) {
    console.error('❌ Classification error:', error?.message || error);
    return {
      has_error: true,
      error_message: `Classification failed: ${error?.message || 'Unknown error'}`,
      next_action: 'end',
    };
  }
}

async function loginHandlerNode(
  state: typeof WorkflowStateAnnotation.State
): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
  console.log('🔑 Handling login issue...');
  return await loginHandler.handle(state);
}

async function complexHandlerNode(
  state: typeof WorkflowStateAnnotation.State
): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
  console.log('⚙️ Handling complex technical issue...');
  return await complexHandler.handle(state);
}

async function generalHandlerNode(
  state: typeof WorkflowStateAnnotation.State
): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
  console.log('📋 Handling general inquiry...');
  return await generalHandler.handle(state);
}

async function qualityEvaluationNode(
  state: typeof WorkflowStateAnnotation.State
): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
  console.log('✅ Evaluating response quality...');
  try {
    return await qualityEvaluator.evaluate(state);
  } catch (error: any) {
    console.error('❌ Quality evaluation error:', error?.message || error);
    return {
      quality_score: 0.5,
      quality_feedback: 'Quality evaluation failed, proceeding with response',
      next_action: 'finalize',
    };
  }
}

async function finalizeResponseNode(
  state: typeof WorkflowStateAnnotation.State
): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
  console.log('📝 Finalizing response...');
  const finalOutput = WorkflowStateUtils.buildJiraResponse(state);
  if (!finalOutput) {
    return {
      error_message: 'Failed to build final response',
      has_error: true,
    };
  }
  return WorkflowStateUtils.markCompleted(state, finalOutput);
}

async function logResponseNode(
  state: typeof WorkflowStateAnnotation.State
): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
  console.log('📝 Logging final response content...');
  if (!state.final_output) {
    console.error('❌ No final output to log.');
    return {
      error_message: 'No final output to log',
      has_error: true,
    };
  }
  console.log('✅ Final Response Body:', JSON.stringify(state.final_output, null, 2));
  return {};
}

async function sendCommentToJiraNode(
  state: typeof WorkflowStateAnnotation.State
): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
  console.log('📤 Sending comment to Jira...');

  // Check if we should send to Jira
  if (!state.send_to_jira) {
    console.log('⏭️  Skipping Jira comment send (send_to_jira=false)');
    return {};
  }

  if (!state.final_output) {
    console.error('❌ No final output to send to Jira.');
    return {
      error_message: 'No final output to send to Jira',
      has_error: true,
    };
  }

  try {
    const { issue_key, comment_content } = state.final_output;

    console.log(`📤 Sending comment to Jira issue: ${issue_key}`);
    const result = await jiraClient.sendComment(issue_key, comment_content);

    if (result.success) {
      console.log(`✅ Comment sent successfully to Jira issue ${issue_key}`);
      return {
        metadata: {
          jira_comment_sent: true,
          jira_response: result.data,
        },
      };
    } else {
      console.error(`❌ Failed to send comment to Jira: ${result.error}`);
      return {
        error_message: `Failed to send comment to Jira: ${result.error}`,
        has_error: true,
        metadata: {
          jira_comment_sent: false,
          jira_error: result.error,
        },
      };
    }
  } catch (error: any) {
    console.error('❌ Exception while sending comment to Jira:', error);
    return {
      error_message: `Exception while sending comment to Jira: ${error?.message || 'Unknown error'}`,
      has_error: true,
      metadata: {
        jira_comment_sent: false,
        jira_error: error?.message,
      },
    };
  }
}

// Routing functions
function routeAfterClassification(state: typeof WorkflowStateAnnotation.State): string {
  if (state.has_error || !state.next_action) {
    console.log('⚠️ Classification failed, ending workflow');
    return 'end';
  }
  const action = state.next_action;
  console.log(`📍 Routing to: ${action}`);
  const routeMap: Record<string, string> = {
    'login_handler': 'login_handler',
    'complex_handler': 'complex_handler',
    'general_handler': 'general_handler',
  };
  return routeMap[action] || 'end';
}

function routeAfterQuality(state: typeof WorkflowStateAnnotation.State): string {
  if (state.has_error) {
    console.log('⚠️ Quality evaluation failed, ending workflow');
    return 'end';
  }
  const action = state.next_action;
  if (action === 'improve_response') {
    if (state.retry_count < state.max_retries) {
      console.log(`🔄 Quality below threshold, retrying (${state.retry_count + 1}/${state.max_retries})`);
      const classification = state.classification?.category;
      if (classification === 'JIRA_SIMPLE') {
        return 'retry_login';
      } else if (classification === 'JIRA_COMPLEX') {
        return 'retry_complex';
      } else {
        return 'retry_general';
      }
    } else {
      console.log('⚠️ Max retries reached, proceeding with current response');
      return 'finalize';
    }
  }
  console.log('✅ Quality acceptable, finalizing response');
  return 'finalize';
}

const workflow = new StateGraph(WorkflowStateAnnotation)
  .addNode('classify', classifyNode)
  .addNode('login_handler', loginHandlerNode)
  .addNode('complex_handler', complexHandlerNode)
  .addNode('general_handler', generalHandlerNode)
  .addNode('quality_evaluation', qualityEvaluationNode)
  .addNode('finalize_response', finalizeResponseNode)
  .addNode('log_response', logResponseNode)
  .addNode('send_comment_to_jira', sendCommentToJiraNode)
  .addEdge(START, 'classify')
  .addConditionalEdges('classify', routeAfterClassification, {
    'login_handler': 'login_handler',
    'complex_handler': 'complex_handler',
    'general_handler': 'general_handler',
    'end': END,
  })
  .addEdge('login_handler', 'quality_evaluation')
  .addEdge('complex_handler', 'quality_evaluation')
  .addEdge('general_handler', 'quality_evaluation')
  .addConditionalEdges('quality_evaluation', routeAfterQuality, {
    'retry_login': 'login_handler',
    'retry_complex': 'complex_handler',
    'retry_general': 'general_handler',
    'finalize': 'finalize_response',
    'end': END,
  })
  .addEdge('finalize_response', 'log_response')
  .addEdge('log_response', 'send_comment_to_jira')
  .addEdge('send_comment_to_jira', END);

export const app = workflow.compile();
