import OpenAI from 'openai';
import { config } from '../utils/config';
import { ClassificationResult, ClassificationSchema, JiraIssueInput, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';

export class ProblemClassificationAgent {
  private openai: OpenAI;

  constructor() {
    // Log configuration details for debugging
    console.log('🔧 [ProblemClassificationAgent] Initializing...');
    console.log('📝 [Config] API Key:', config.openai.apiKey ? `${config.openai.apiKey.substring(0, 20)}...${config.openai.apiKey.substring(config.openai.apiKey.length - 4)}` : 'NOT SET');
    console.log('📝 [Config] Model:', config.openai.model);
    console.log('📝 [Config] Base URL:', config.openai.baseUrl);
    console.log('📝 [Config] Test Mode:', config.app.testMode);

    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });

    console.log('✅ [ProblemClassificationAgent] OpenAI client created');
  }

  async classify(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    try {
      const classification = await this.performClassification(request);
      const processingTime = Date.now() - startTime;

      const processingStep: ProcessingStep = {
        step_name: 'classification',
        agent_name: 'ProblemClassificationAgent',
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
          },
          processing_time: processingTime,
        },
        success: true,
      };

      return {
        classification,
        processing_history: [processingStep],
        current_agent: 'ProblemClassificationAgent',
        next_action: this.determineNextAction(classification),
        has_error: false,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorStep: ProcessingStep = {
        step_name: 'classification',
        agent_name: 'ProblemClassificationAgent',
        timestamp: new Date().toISOString(),
        input: {
          summary: request.forms.Summary,
          comment: request.forms.Comment.Content,
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_classification',
          response_content: 'Classification failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async performClassification(request: JiraIssueInput): Promise<ClassificationResult> {
    const summary = request.forms.Summary;
    const comment = request.forms.Comment.Content;

    console.log('🔍 [Classifier] Starting classification...');
    console.log('📄 [Classifier] Summary:', summary.substring(0, 50) + '...');
    console.log('💬 [Classifier] Comment:', comment.substring(0, 50) + '...');

    const systemPrompt = this.buildClassificationPrompt();
    const userContent = this.buildUserContent(summary, comment);

    console.log('🌐 [Classifier] Calling OpenAI API...');
    console.log('📝 [Classifier] Using Model:', config.openai.model);
    console.log('🔗 [Classifier] Using Base URL:', config.openai.baseUrl);

    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'problem_classification',
            schema: ClassificationSchema,
          },
        },
        temperature: 0.1,
      });

      console.log('✅ [Classifier] OpenAI API call successful');

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No classification result received from OpenAI');
      }

      return JSON.parse(result) as ClassificationResult;
    } catch (error: any) {
      console.error('❌ [Classifier] OpenAI API call failed');
      console.error('❌ [Classifier] Error type:', error?.constructor?.name || 'Unknown');
      console.error('❌ [Classifier] Error message:', error?.message || String(error));
      if (error?.status) {
        console.error('❌ [Classifier] HTTP Status:', error.status);
      }
      if (error?.code) {
        console.error('❌ [Classifier] Error code:', error.code);
      }
      throw error;
    }
  }

  private buildClassificationPrompt(): string {
    return `You are an expert Jira customer service issue classifier. Your task is to analyze customer support requests and categorize them into one of three categories:

**JIRA_SIMPLE**: Basic Jira issues that can be resolved quickly
- Login problems and password resets
- User account issues (locked accounts, permission requests)
- Basic field configuration questions
- Confluence integration questions
- Simple workflow questions
- Basic notification settings
- UI navigation help

**JIRA_COMPLEX**: Advanced technical issues requiring deeper expertise
- Script Runner problems and custom script debugging
- Complex workflow configuration and automation
- External system integrations (REST API, webhooks, LDAP)
- JQL (Jira Query Language) complex queries
- Custom field schemes and screen configurations
- Performance issues and system analysis
- Log analysis and error troubleshooting
- Advanced permission schemes
- Marketplace app integration issues

**GENERAL**: Non-Jira related inquiries
- General company policies
- Non-technical questions
- Training requests
- Feature requests unrelated to current Jira functionality
- Questions about other tools/systems
- Administrative queries not related to Jira functionality

Analyze the issue summary and comment content, then classify accordingly. Consider:
1. The technical complexity level required
2. Whether specialized Jira knowledge is needed
3. If the issue involves coding, automation, or integrations
4. The urgency and impact of the problem
5. Language patterns and technical terms used

Provide your classification with high confidence and clear reasoning based on the content analysis.`;
  }

  private buildUserContent(summary: string, comment: string): string {
    return `Please classify the following Jira support request:

**Issue Summary**: ${summary}

**Customer Comment**: ${comment}

Analyze this request and provide:
1. Category classification (JIRA_SIMPLE, JIRA_COMPLEX, or GENERAL)
2. Confidence level (0-1)
3. Detailed reasoning for your classification
4. Key indicators that led to this classification`;
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

  // Helper method to get classification examples for testing
  static getClassificationExamples(): { input: JiraIssueInput; expected: string }[] {
    return [
      {
        input: {
          forms: {
            "Project ID": "JCSC-1",
            "Issue Type": "Support Request",
            "Reporter": "PETER.W.WANG",
            "Created": "2025/9/22 10:15",
            "Updated": "2025/9/23 09:20",
            "Summary": "無法登入Jira系統",
            "Comment": {
              "Created": "2025/9/23 09:20",
              "Updated": "2025/9/23 09:20",
              "Content": "我嘗試用我的公司帳號密碼登入，但系統一直提示「用戶名或密碼錯誤」。我確定密碼是正確的，因為其他系統都能登入。請問是我的帳號被鎖定，還是需要另外申請權限？"
            }
          }
        },
        expected: 'JIRA_SIMPLE'
      },
      {
        input: {
          forms: {
            "Project ID": "JCSC-2",
            "Issue Type": "Technical Support",
            "Reporter": "ADMIN.USER",
            "Created": "2025/9/22 14:30",
            "Updated": "2025/9/23 10:15",
            "Summary": "Script Runner 自動化流程執行失敗",
            "Comment": {
              "Created": "2025/9/23 10:15",
              "Updated": "2025/9/23 10:15",
              "Content": "我們的Script Runner自動化流程在處理工單狀態轉換時出現錯誤。錯誤日誌顯示'NullPointerException at line 45'。這個腳本是用來自動分配責任人並發送通知郵件的，但現在完全無法運作。需要技術人員協助分析腳本代碼和系統日誌。"
            }
          }
        },
        expected: 'JIRA_COMPLEX'
      }
    ];
  }
}