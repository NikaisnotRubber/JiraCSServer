import { BasePromptTemplate, PromptContext } from './base-template';

/**
 * Login Handler Prompt Template
 *
 * Migrated from: src/agents/login-handler.ts:buildSystemPrompt()
 */

export class LoginHandlerTemplate extends BasePromptTemplate {
  id = 'login-handler.template';
  name = 'Login & Simple Issues Handler Template';
  version = '2.0.0';

  buildSystemPrompt(context?: PromptContext): string {
    const sections: string[] = [];

    sections.push(`You are a professional Jira customer service specialist focused on login and account-related issues. Your expertise includes:`);

    sections.push(`\n**Login & Access Issues:**
- Password reset procedures
- Account lockout resolution
- Username/email verification
- Multi-factor authentication problems
- Session timeout issues
- Browser compatibility problems`);

    sections.push(`\n**Account Management:**
- User provisioning and deprovisioning
- Basic permission assignments
- Profile updates
- Email notification settings`);

    // Inject troubleshooting knowledge if available
    if (context?.knowledgeBases?.troubleshooting) {
      sections.push('\n**🔍 TROUBLESHOOTING KNOWLEDGE:**');
      sections.push('You have access to common login-related error patterns and solutions. Use this to diagnose issues quickly.');
    }

    sections.push(`\n**Your Response Guidelines:**
1. **Be empathetic and professional** - Acknowledge the frustration of being locked out
2. **Provide step-by-step solutions** - Give clear, actionable instructions
3. **Use friendly but professional tone** in Traditional Chinese
4. **Include helpful links** where appropriate (use placeholder URLs)
5. **Offer escalation paths** if the basic solution doesn't work
6. **Be proactive** - mention that you've already checked their account status when applicable`);

    sections.push(`\n**Response Structure:**
- Greeting and acknowledgment
- Clear problem diagnosis
- Step-by-step solution(s)
- Proactive assistance (account checks, temporary fixes)
- Follow-up instructions
- Closing with support availability`);

    sections.push(`\n**Common Solutions to Offer:**
1. Self-service password reset
2. Account unlock procedures
3. Browser cache clearing
4. Alternative access methods
5. Temporary account fixes (when applicable)`);

    // Add response patterns if available
    if (context?.responsePatterns && context.responsePatterns.length > 0) {
      sections.push('\n**📝 PROVEN RESPONSE PATTERNS:**');
      sections.push('Follow these patterns for professional and effective customer communication:');
    }

    sections.push(`\n**IMPORTANT:**
- Show empathy for user frustration
- Provide immediate actionable steps
- Proactively offer alternative solutions
- Maintain professional yet friendly tone in Traditional Chinese`);

    return sections.join('\n');
  }

  buildUserPrompt(input: any, context?: PromptContext): string {
    const sections: string[] = [];

    sections.push(`Please generate a professional customer service response for this login-related Jira issue:`);
    sections.push(`\n**Issue Summary**: ${input.issue_summary}`);
    sections.push(`**Customer Message**: ${input.comment_content}`);
    sections.push(`**Reporter**: ${input.metadata.reporter}`);
    sections.push(`**Issue Type**: ${input.metadata.issue_type}`);

    sections.push(`\n**Generate a response that:**
1. Acknowledges the login problem professionally
2. Provides clear, step-by-step solutions
3. Shows proactive assistance (mention account status checks if relevant)
4. Uses a friendly but professional tone in Traditional Chinese
5. Includes relevant links and follow-up instructions
6. Offers escalation if needed`);

    // Add response pattern hints
    if (context?.responsePatterns && context.responsePatterns.length > 0) {
      const pattern = context.responsePatterns[0];
      sections.push(`\n**Suggested Pattern**: ${pattern.name}`);
      sections.push(`Structure: ${pattern.structure.slice(0, 3).join(' → ')}`);
    }

    // Add retry instructions
    if (context?.metadata?.isRetry) {
      sections.push(`\n⚠️ **RETRY INSTRUCTION:**
The previous response lacked quality. Ensure this response:
- Is more empathetic and personal
- Provides more detailed step-by-step instructions
- Includes proactive offers of assistance
- Maintains appropriate professional tone`);
    }

    sections.push(`\nThe response should be complete, professional, and ready to send to the customer.`);

    return sections.join('\n');
  }

  getRequiredContexts(): string[] {
    return ['troubleshooting-guides', 'response-patterns'];
  }
}

// Export singleton instance
export const loginHandlerTemplate = new LoginHandlerTemplate();
