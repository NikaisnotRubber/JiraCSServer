import { ChatOpenAI } from '@langchain/openai';
import { config } from '../utils/config';
import { PostProcessInput } from '../types/extended';
import { AgentOutput, AgentOutputSchema } from '../types';

/**
 * Post-Process Handler Agent
 * Handles follow-up questions and additional context from users
 */
export class PostProcessHandlerAgent {
  private model: ChatOpenAI;

  constructor() {
    this.model = new ChatOpenAI({
      model: config.openai.model,
      apiKey: config.openai.apiKey,
      configuration: {
        baseURL: config.openai.baseUrl,
      },
      temperature: 0.3,
    });
  }

  /**
   * Process follow-up interaction
   */
  async processFollowUp(input: PostProcessInput): Promise<AgentOutput> {
    const startTime = Date.now();

    console.log(`🔄 Processing follow-up for issue ${input.original_issue_key}`);

    try {
      // Build conversation context
      const conversationContext = this.buildConversationContext(input);

      // Create system prompt
      const systemPrompt = this.createSystemPrompt();

      // Create user message with context
      const userMessage = this.createUserMessage(input, conversationContext);

      // Get structured response from LLM
      const structuredModel = this.model.withStructuredOutput(AgentOutputSchema);

      const response = await structuredModel.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ]);

      const processingTime = Date.now() - startTime;

      console.log(`✅ Follow-up processed in ${processingTime}ms`);

      return {
        confidence: 1.0,
        suggested_action: 'send_response',
        response_content: response.content || '',
        processing_time: processingTime,
        metadata: {
          original_issue_key: input.original_issue_key,
          workflow_id: input.workflow_id,
          is_follow_up: true,
        },
      };
    } catch (error) {
      console.error('❌ Follow-up processing failed:', error);

      return {
        confidence: 0,
        suggested_action: 'escalate_to_human',
        response_content: 'I apologize, but I encountered an error while processing your follow-up question. A human agent will review your request shortly.',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          original_issue_key: input.original_issue_key,
          workflow_id: input.workflow_id,
          is_follow_up: true,
        },
        processing_time: Date.now() - startTime,
      };
    }
  }

  /**
   * Build conversation context from history
   */
  private buildConversationContext(input: PostProcessInput): string {
    if (!input.context?.conversation_history || input.context.conversation_history.length === 0) {
      return 'No previous conversation history available.';
    }

    const history = input.context.conversation_history
      .map((msg) => {
        const role = msg.role === 'user' ? '👤 User' : '🤖 Agent';
        return `${role} [${msg.timestamp}]:\n${msg.content}`;
      })
      .join('\n\n---\n\n');

    return history;
  }

  /**
   * Create system prompt for post-processing
   */
  private createSystemPrompt(): string {
    return `You are an AI assistant for Jira Customer Service, specialized in handling follow-up questions and providing additional support.

Your role:
- Answer follow-up questions based on the conversation context
- Provide clarifications when requested
- Offer additional help or alternative solutions
- Maintain consistency with previous responses
- Be helpful, concise, and professional

When responding:
1. Review the entire conversation history to understand the context
2. Directly address the user's follow-up question
3. Reference previous responses when relevant
4. Provide clear, actionable guidance
5. Offer to escalate to a human agent if the issue is complex or unresolved

Response format:
- confidence: Your confidence level (0-1) in addressing the follow-up
- suggested_action: One of ["provide_answer", "request_clarification", "escalate_to_human", "close_issue"]
- response_content: Your detailed response to the user (in the same language as the user's question)
- metadata: Additional information about the response

Important:
- Always maintain a helpful and professional tone
- If you're unsure about something, acknowledge it and offer to escalate
- Keep responses concise but complete
- Use the same language as the user's input`;
  }

  /**
   * Create user message with full context
   */
  private createUserMessage(input: PostProcessInput, conversationContext: string): string {
    return `
## Original Issue
**Issue Key:** ${input.original_issue_key}
**Workflow ID:** ${input.workflow_id}
**Reporter:** ${input.user}

## Conversation History
${conversationContext}

${
  input.context?.previous_response
    ? `
## Previous Agent Response
${input.context.previous_response}
`
    : ''
}

## New Follow-up Question/Comment
**Timestamp:** ${input.timestamp}
**Content:**
${input.follow_up_content}

---

Please analyze the follow-up content in the context of the conversation history and provide an appropriate response.
`.trim();
  }

  /**
   * Validate post-process input
   */
  static validateInput(input: any): input is PostProcessInput {
    return (
      typeof input === 'object' &&
      typeof input.original_issue_key === 'string' &&
      typeof input.workflow_id === 'string' &&
      typeof input.follow_up_content === 'string' &&
      typeof input.user === 'string' &&
      typeof input.timestamp === 'string'
    );
  }
}
