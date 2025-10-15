import { JiraKnowledgeContext } from '../templates/base-template';

/**
 * Jira Domain Knowledge Base
 *
 * This module provides rich, structured domain knowledge about Jira features,
 * integrations, and best practices. It serves as a replacement for RAG by
 * providing comprehensive background context directly in prompts.
 *
 * Benefits over RAG:
 * - No retrieval latency
 * - Deterministic context inclusion
 * - Better handling of multi-hop reasoning
 * - Version-controlled knowledge
 */

/**
 * Core Jira knowledge base
 */
export const jiraKnowledgeBase: JiraKnowledgeContext = {
  features: [
    {
      category: 'Authentication & Access',
      description: 'User login, password management, and account access control',
      commonIssues: [
        'Password reset failures',
        'Account lockout after multiple failed attempts',
        'Session timeout issues',
        'SSO integration problems',
        'Browser compatibility affecting login',
      ],
      keywords: ['login', 'password', 'access', 'authentication', '登入', '密碼', '帳號', '權限'],
    },
    {
      category: 'Script Runner',
      description: 'Groovy scripting automation for workflows, listeners, and scheduled jobs',
      commonIssues: [
        'NullPointerException in custom scripts',
        'Script console access denied',
        'Post-function execution failures',
        'Groovy syntax errors',
        'Performance issues with complex scripts',
        'Script version compatibility problems',
      ],
      keywords: ['script', 'groovy', 'automation', 'post-function', 'listener', 'scriptrunner', '腳本', '自動化'],
    },
    {
      category: 'Workflow Configuration',
      description: 'Issue workflow design, transitions, conditions, and validators',
      commonIssues: [
        'Transition conditions not working',
        'Workflow scheme conflicts',
        'Status synchronization problems',
        'Circular workflow dependencies',
        'Permission issues in transitions',
      ],
      keywords: ['workflow', 'transition', 'status', 'condition', 'validator', '工作流', '狀態', '轉換'],
    },
    {
      category: 'JQL (Jira Query Language)',
      description: 'Advanced search queries and filters',
      commonIssues: [
        'Complex query syntax errors',
        'Performance issues with large result sets',
        'Custom field querying problems',
        'Date range query confusion',
        'Function usage in filters',
      ],
      keywords: ['jql', 'query', 'search', 'filter', 'find', '搜尋', '查詢', '篩選'],
    },
    {
      category: 'Custom Fields',
      description: 'Custom field creation, configuration, and management',
      commonIssues: [
        'Field not appearing on screens',
        'Custom field context conflicts',
        'Field type limitations',
        'Bulk update field failures',
        'Custom field performance impact',
      ],
      keywords: ['custom field', 'field configuration', 'screen', 'context', '自定義欄位', '欄位', '配置'],
    },
    {
      category: 'REST API & Webhooks',
      description: 'External integrations via REST API and webhook automation',
      commonIssues: [
        'Authentication failures (API tokens, OAuth)',
        'Webhook delivery failures',
        'Rate limiting issues',
        'Payload parsing errors',
        'SSL/TLS certificate problems',
        'CORS configuration issues',
      ],
      keywords: ['api', 'rest', 'webhook', 'integration', 'oauth', 'token', '接口', '整合', 'webhook'],
    },
    {
      category: 'Permissions & Security',
      description: 'Project permissions, roles, and security schemes',
      commonIssues: [
        'Permission scheme configuration errors',
        'Role assignment problems',
        'Project-level vs global permissions confusion',
        'Browse project permission issues',
        'Admin permission escalation needs',
      ],
      keywords: ['permission', 'role', 'security', 'access control', 'admin', '權限', '角色', '安全性'],
    },
    {
      category: 'Performance & Logs',
      description: 'System performance analysis and log troubleshooting',
      commonIssues: [
        'Slow page load times',
        'Database query optimization needs',
        'Log file analysis requirements',
        'Memory usage concerns',
        'Index rebuilding needs',
      ],
      keywords: ['performance', 'slow', 'log', 'error', 'debug', 'optimize', '效能', '日誌', '錯誤', '優化'],
    },
    {
      category: 'LDAP/Active Directory',
      description: 'User directory integration and synchronization',
      commonIssues: [
        'User sync failures',
        'Group mapping problems',
        'Connection timeout issues',
        'DN (Distinguished Name) configuration errors',
        'Nested group support limitations',
      ],
      keywords: ['ldap', 'active directory', 'ad', 'user sync', 'directory', 'group', '目錄', '同步'],
    },
    {
      category: 'Confluence Integration',
      description: 'Jira-Confluence linking and content embedding',
      commonIssues: [
        'Application link configuration failures',
        'Cross-product macro rendering issues',
        'OAuth handshake problems',
        'Link authentication failures',
      ],
      keywords: ['confluence', 'wiki', 'documentation', 'application link', '文檔', '連結'],
    },
  ],

  integrations: [
    {
      name: 'Script Runner',
      description: 'Powerful Groovy scripting add-on for workflow automation and custom behaviors',
      commonProblems: [
        'Script compilation errors due to API changes',
        'Context object availability in different script types',
        'Permission requirements for script execution',
        'Debugging script logic without proper logging',
      ],
    },
    {
      name: 'REST API',
      description: 'RESTful web services for external system integration',
      commonProblems: [
        'API token vs password authentication confusion',
        'JSON payload structure errors',
        'Pagination handling for large data sets',
        'Rate limiting and throttling',
      ],
    },
    {
      name: 'LDAP/Active Directory',
      description: 'Enterprise user directory integration',
      commonProblems: [
        'Firewall blocking LDAP port (389/636)',
        'Service account permissions insufficient',
        'Incorrect base DN configuration',
        'Group sync timing issues',
      ],
    },
    {
      name: 'Webhooks',
      description: 'Event-driven notifications to external systems',
      commonProblems: [
        'Endpoint URL unreachable from Jira server',
        'Webhook payload format mismatches',
        'Event filtering not working as expected',
        'Retry mechanism exhaustion',
      ],
    },
  ],

  bestPractices: [
    'Always test workflow changes in a non-production project first',
    'Use Script Runner console for testing Groovy code before deploying to workflows',
    'Document complex JQL queries with comments in filter descriptions',
    'Implement proper error handling in custom scripts (try-catch blocks)',
    'Use bulk operations APIs for processing large numbers of issues',
    'Regularly review and optimize permission schemes to minimize complexity',
    'Keep API tokens secure and rotate them periodically',
    'Monitor webhook delivery success rates and implement retry logic',
    'Use custom field contexts to limit field scope and improve performance',
    'Backup workflow schemes before making significant changes',
    'Implement logging in custom scripts for troubleshooting',
    'Test LDAP sync with small user groups before full deployment',
  ],
};

/**
 * Get context-specific knowledge based on keywords
 */
export function getRelevantJiraKnowledge(keywords: string[]): JiraKnowledgeContext {
  const relevantFeatures = jiraKnowledgeBase.features.filter(feature =>
    keywords.some(keyword =>
      feature.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase())) ||
      feature.category.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  const relevantIntegrations = jiraKnowledgeBase.integrations.filter(integration =>
    keywords.some(keyword =>
      integration.name.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  return {
    features: relevantFeatures.length > 0 ? relevantFeatures : jiraKnowledgeBase.features.slice(0, 3),
    integrations: relevantIntegrations.length > 0 ? relevantIntegrations : jiraKnowledgeBase.integrations.slice(0, 2),
    bestPractices: jiraKnowledgeBase.bestPractices,
  };
}

/**
 * Extract keywords from issue summary and content
 */
export function extractKeywords(summary: string, content: string): string[] {
  const text = `${summary} ${content}`.toLowerCase();
  const keywords: string[] = [];

  // Extract feature keywords
  jiraKnowledgeBase.features.forEach(feature => {
    feature.keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    });
  });

  // Extract integration keywords
  jiraKnowledgeBase.integrations.forEach(integration => {
    if (text.includes(integration.name.toLowerCase())) {
      keywords.push(integration.name);
    }
  });

  return [...new Set(keywords)]; // Remove duplicates
}
