import { BasePromptTemplate, PromptContext } from './base-template';

/**
 * Classifier Prompt Template
 *
 * Migrated from: src/agents/classifier.ts:buildClassificationPrompt()
 */

export class ClassifierTemplate extends BasePromptTemplate {
  id = 'classifier.template';
  name = 'Problem Classification Template';
  version = '2.0.0';

  buildSystemPrompt(context?: PromptContext): string {
    const sections: string[] = [];

    // Core classification role
    sections.push(`You are an expert Jira customer service issue classifier. Your task is to analyze customer support requests and categorize them into one of three categories:`);

    sections.push(`\n**JIRA_SIMPLE**: Basic Jira issues that can be resolved quickly
- Login problems and password resets
- User account issues (locked accounts, permission requests)
- Basic field configuration questions
- Confluence integration questions
- Simple workflow questions
- Basic notification settings
- UI navigation help`);

    sections.push(`\n**JIRA_COMPLEX**: Advanced technical issues requiring deeper expertise
- Script Runner problems and custom script debugging
- Complex workflow configuration and automation
- External system integrations (REST API, webhooks, LDAP)
- JQL (Jira Query Language) complex queries
- Custom field schemes and screen configurations
- Performance issues and system analysis
- Log analysis and error troubleshooting
- Advanced permission schemes
- Marketplace app integration issues`);

    sections.push(`\n**GENERAL**: Non-Jira related inquiries
- General company policies
- Non-technical questions
- Training requests
- Feature requests unrelated to current Jira functionality
- Questions about other tools/systems
- Administrative queries not related to Jira functionality`);

    // Add domain knowledge if available in context
    if (context?.knowledgeBases?.jira) {
      sections.push('\n**📚 Domain Knowledge for Classification:**');
      const jira = context.knowledgeBases.jira;

      sections.push('\n**Feature Categories to Consider:**');
      jira.features.slice(0, 5).forEach(feature => {
        sections.push(`- **${feature.category}**: ${feature.keywords.slice(0, 3).join(', ')}`);
      });
    }

    sections.push(`\n**Analysis Criteria:**
1. The technical complexity level required
2. Whether specialized Jira knowledge is needed
3. If the issue involves coding, automation, or integrations
4. The urgency and impact of the problem
5. Language patterns and technical terms used`);

    sections.push(`\n**Classification Guidelines:**
- Provide high confidence (>0.8) when indicators are clear
- Use moderate confidence (0.5-0.8) when issue spans multiple categories
- Identify specific keywords that drove the classification decision
- Provide detailed reasoning that explains the classification logic`);

    return sections.join('\n');
  }

  buildUserPrompt(input: any, context?: PromptContext): string {
    const { summary, comment } = input;

    const sections: string[] = [];

    sections.push(`Please classify the following Jira support request:`);
    sections.push(`\n**Issue Summary**: ${summary}`);
    sections.push(`\n**Customer Comment**: ${comment}`);

    sections.push(`\nAnalyze this request and provide:
1. **Category classification** (JIRA_SIMPLE, JIRA_COMPLEX, or GENERAL)
2. **Confidence level** (0-1, where 1 is absolute certainty)
3. **Detailed reasoning** for your classification
4. **Key indicators** that led to this classification (specific keywords or patterns found)`);

    // Add context-specific guidance
    if (context?.metadata?.isRetry) {
      sections.push(`\n⚠️ **RETRY NOTICE**: Previous classification may have been incorrect. Carefully re-analyze the request.`);
    }

    return sections.join('\n');
  }

  getRequiredContexts(): string[] {
    return ['jira-knowledge-base'];
  }
}

// Export singleton instance
export const classifierTemplate = new ClassifierTemplate();
