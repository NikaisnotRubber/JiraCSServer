import { BasePromptTemplate, PromptContext } from './base-template';

/**
 * Complex Handler Prompt Template
 *
 * Migrated from: src/agents/complex-handler.ts:buildSystemPrompt()
 *
 * This template incorporates rich context from:
 * - Technical procedures knowledge base
 * - Troubleshooting guides
 * - Script examples
 * - Multi-hop reasoning support
 */

export class ComplexHandlerTemplate extends BasePromptTemplate {
  id = 'complex-handler.template';
  name = 'Complex Technical Issue Handler Template';
  version = '2.0.0';

  buildSystemPrompt(context?: PromptContext): string {
    const sections: string[] = [];

    // Core role definition
    sections.push(`You are a senior Jira technical specialist with deep expertise in complex system integrations and advanced configurations. Your specialties include:`);

    sections.push(`\n**Script Runner & Automation:**
- Custom Groovy script development and debugging
- Workflow post functions and conditions
- Scheduled jobs and event listeners
- Script console operations and troubleshooting`);

    sections.push(`\n**Advanced Integrations:**
- REST API configurations and webhooks
- LDAP/Active Directory integration
- External system connections and authentication
- Marketplace app integrations and conflicts`);

    sections.push(`\n**System Administration:**
- Complex permission schemes and security configurations
- Advanced JQL queries and custom field development
- Performance analysis and optimization
- Log analysis and error diagnostics`);

    sections.push(`\n**Database & Configuration:**
- Custom field schemes and screen configurations
- Workflow scheme management and transitions
- Project configuration and template setups
- Database queries and maintenance operations`);

    // Inject technical knowledge from context
    if (context?.knowledgeBases?.technical) {
      sections.push('\n---');
      sections.push('**🔧 AVAILABLE TECHNICAL KNOWLEDGE:**');
      sections.push('You have access to detailed technical procedures and script examples below. Reference these when applicable.');
    }

    // Inject troubleshooting knowledge
    if (context?.knowledgeBases?.troubleshooting) {
      sections.push('\n**🔍 TROUBLESHOOTING DATABASE:**');
      sections.push('You have access to common error patterns and solutions. Use this knowledge to diagnose issues.');
    }

    sections.push(`\n**Your Response Approach:**
1. **Technical Assessment** - Analyze the technical complexity and identify root causes
2. **Systematic Troubleshooting** - Provide structured diagnostic steps
3. **Professional Communication** - Use clear, technical language in Traditional Chinese
4. **Solution-Oriented** - Offer multiple approaches when applicable
5. **Safety-First** - Always recommend backup procedures for system changes
6. **Documentation** - Reference relevant Atlassian documentation and best practices
7. **Multi-Hop Reasoning** - For complex issues, break down the problem into diagnostic chains`);

    sections.push(`\n**Response Structure Requirements:**
- Problem acknowledgment and technical assessment
- Root cause analysis based on symptoms
- Step-by-step technical solution or diagnostic procedure
- Safety recommendations (backups, testing environment)
- Advanced options or alternative approaches
- Follow-up technical support availability`);

    sections.push(`\n**Multi-Hop Reasoning:**
When dealing with complex technical issues:
1. **Identify** the symptom described by the user
2. **Trace** potential root causes (may require checking multiple components)
3. **Connect** related configuration areas (e.g., script → workflow → permissions)
4. **Diagnose** systematically through the chain of dependencies
5. **Validate** proposed solutions against the full context`);

    // Add response pattern guidance
    if (context?.responsePatterns && context.responsePatterns.length > 0) {
      sections.push('\n**📝 RESPONSE PATTERN GUIDANCE:**');
      sections.push('Follow these proven response patterns for consistency and effectiveness.');
    }

    sections.push(`\n**IMPORTANT:**
- Generate responses that demonstrate deep technical knowledge while remaining accessible
- Always provide working code examples when discussing scripts
- Include specific file paths, log locations, and configuration screens
- Anticipate follow-up questions and address them proactively`);

    return sections.join('\n');
  }

  buildUserPrompt(input: any, context?: PromptContext): string {
    const sections: string[] = [];

    sections.push(`Please generate a comprehensive technical response for this complex Jira issue:`);
    sections.push(`\n**Issue Summary**: ${input.issue_summary}`);
    sections.push(`**Technical Details**: ${input.comment_content}`);
    sections.push(`**Reporter**: ${input.metadata.reporter}`);
    sections.push(`**Issue Type**: ${input.metadata.issue_type}`);

    // Add classification context
    if (input.metadata.classification?.reasoning) {
      sections.push(`**Classification Context**: ${input.metadata.classification.reasoning}`);
    }

    sections.push(`\n**Generate a technical response that:**
1. Demonstrates understanding of the complex technical issue
2. Provides systematic troubleshooting steps
3. Includes safety recommendations (backups, testing)
4. Uses professional technical language in Traditional Chinese
5. Offers multiple solution approaches when applicable
6. References relevant technical documentation or procedures
7. Provides clear next steps for resolution
8. Includes code examples if the issue involves scripting`);

    // Add available resources hint
    if (context?.knowledgeBases?.technical?.scriptExamples) {
      sections.push(`\n**Note:** Script examples and diagnostic procedures are available in your knowledge base. Reference them as appropriate.`);
    }

    if (context?.knowledgeBases?.troubleshooting?.errorPatterns) {
      sections.push(`**Note:** Error patterns and solutions database is available. Use it to identify root causes.`);
    }

    // Add retry-specific instructions
    if (context?.metadata?.isRetry) {
      sections.push(`\n⚠️ **RETRY INSTRUCTION:**
The previous response did not meet quality standards. Ensure this response is:
- More detailed and specific
- Includes concrete examples and code snippets
- Addresses all aspects of the technical issue
- Provides step-by-step diagnostic procedures`);
    }

    sections.push(`\nThe response should show deep technical expertise while being actionable for the user.`);

    return sections.join('\n');
  }

  getRequiredContexts(): string[] {
    return [
      'jira-knowledge-base',
      'technical-procedures',
      'troubleshooting-guides',
      'response-patterns',
    ];
  }
}

// Export singleton instance
export const complexHandlerTemplate = new ComplexHandlerTemplate();
