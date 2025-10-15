import { TechnicalKnowledgeContext } from '../templates/base-template';

/**
 * Technical Procedures Knowledge Base
 *
 * Provides detailed technical procedures, diagnostic steps, and script examples
 * for complex Jira technical issues.
 *
 * This enables the model to perform multi-hop reasoning without RAG by providing
 * comprehensive procedural knowledge directly in context.
 */

export const technicalProcedures: TechnicalKnowledgeContext = {
  diagnosticProcedures: [
    {
      symptom: 'Script Runner post-function failing with NullPointerException',
      steps: [
        '1. Access Administration → Manage Apps → Script Console',
        '2. Review the full stack trace from atlassian-jira.log',
        '3. Identify the line number causing the NPE',
        '4. Check if required fields/objects are null before accessing',
        '5. Add null checks: if (issue.customFieldManager.getCustomFieldObject("customfield_xxxxx") != null)',
        '6. Test the script in Script Console before deploying to workflow',
        '7. Add comprehensive logging: log.warn("Debug: issue = ${issue}, field = ${field}")',
      ],
      expectedOutcome: 'Script executes without exceptions and proper error handling is in place',
    },
    {
      symptom: 'LDAP user synchronization not working',
      steps: [
        '1. Navigate to Administration → User Directories',
        '2. Test the LDAP connection using "Test Connection" button',
        '3. Verify Base DN is correct (e.g., dc=company,dc=com)',
        '4. Check User DN and Group DN mappings',
        '5. Review synchronization settings (interval, filters)',
        '6. Check firewall allows traffic on port 389 (LDAP) or 636 (LDAPS)',
        '7. Verify service account has sufficient read permissions in AD',
        '8. Review atlassian-jira.log for LDAP-related errors during sync',
        '9. Perform manual synchronization and monitor progress',
      ],
      expectedOutcome: 'Users and groups sync successfully from LDAP/AD to Jira',
    },
    {
      symptom: 'REST API returning 401 Unauthorized',
      steps: [
        '1. Verify API token is being used (not password) for Jira Cloud',
        '2. Check authentication header format: Authorization: Basic base64(email:token)',
        '3. For Jira Server/DC: Ensure password authentication is enabled',
        '4. Test with curl: curl -u email:token https://your-domain.atlassian.net/rest/api/3/myself',
        '5. Verify the user account has necessary permissions for the API endpoint',
        '6. Check if account is locked or disabled',
        '7. Review API token expiration (regenerate if needed)',
      ],
      expectedOutcome: 'API requests succeed with 200 OK status',
    },
    {
      symptom: 'Webhook not delivering events',
      steps: [
        '1. Navigate to System → WebHooks and check webhook status',
        '2. Verify the endpoint URL is accessible from Jira server',
        '3. Test endpoint with curl from Jira server: curl -X POST -d \'{}\' https://endpoint-url',
        '4. Check webhook event filters match the events you expect',
        '5. Review webhook execution history for error messages',
        '6. Ensure endpoint returns 200 OK within timeout period (10 seconds)',
        '7. Check endpoint SSL certificate is valid (if HTTPS)',
        '8. Review firewall rules allowing outbound connections',
        '9. Implement webhook retry logic on receiving end',
      ],
      expectedOutcome: 'Webhooks deliver successfully with 200 OK response',
    },
    {
      symptom: 'Custom field not appearing on issue screen',
      steps: [
        '1. Go to Administration → Issues → Custom Fields',
        '2. Find the custom field and click "Contexts and Default Value"',
        '3. Verify the field context includes the target project/issue type',
        '4. Navigate to Administration → Issues → Screens',
        '5. Identify the screen used by the issue type (Create, Edit, or View)',
        '6. Add the custom field to the appropriate screen tab',
        '7. Clear browser cache and reload the issue',
        '8. Check field configuration scheme is associated with the project',
      ],
      expectedOutcome: 'Custom field appears on issue create/edit screens',
    },
    {
      symptom: 'JQL query returning unexpected results',
      steps: [
        '1. Break down complex query into smaller parts',
        '2. Test each clause individually to isolate the issue',
        '3. Check operator precedence (AND before OR, use parentheses)',
        '4. Verify custom field names use correct syntax: cf[field_id] or "Field Name"',
        '5. For date queries, ensure proper format: created >= "2025-01-01"',
        '6. Use in() for multiple values: status in (Open, "In Progress")',
        '7. Test functions like currentUser(), now(), startOfDay()',
        '8. Check query performance with "Explain" button in filter editor',
      ],
      expectedOutcome: 'JQL query returns expected and accurate results',
    },
  ],

  scriptExamples: [
    {
      useCase: 'Auto-assign issue based on component',
      language: 'Groovy (Script Runner)',
      code: `import com.atlassian.jira.component.ComponentAccessor
import com.atlassian.jira.issue.Issue
import com.atlassian.jira.user.ApplicationUser

// Get the current issue
Issue issue = issue

// Get components
def components = issue.components

if (components) {
    def componentName = components.first().name
    def userManager = ComponentAccessor.getUserManager()
    ApplicationUser assignee = null

    // Map components to users
    switch(componentName) {
        case "Backend":
            assignee = userManager.getUserByName("backend.lead")
            break
        case "Frontend":
            assignee = userManager.getUserByName("frontend.lead")
            break
        case "Database":
            assignee = userManager.getUserByName("dba.lead")
            break
        default:
            assignee = userManager.getUserByName("default.assignee")
    }

    if (assignee) {
        issue.setAssignee(assignee)
        log.warn("Auto-assigned issue \${issue.key} to \${assignee.displayName}")
    }
}`,
      explanation: 'This script automatically assigns issues based on their component. Use as a post-function on issue creation.',
    },
    {
      useCase: 'Validate custom field before transition',
      language: 'Groovy (Script Runner)',
      code: `import com.atlassian.jira.component.ComponentAccessor
import com.atlassian.jira.issue.Issue
import com.atlassian.jira.issue.fields.CustomField

Issue issue = issue
def customFieldManager = ComponentAccessor.getCustomFieldManager()

// Get custom field "Risk Assessment"
CustomField riskField = customFieldManager.getCustomFieldObjectByName("Risk Assessment")

if (riskField) {
    def riskValue = issue.getCustomFieldValue(riskField) as String

    if (!riskValue || riskValue.isEmpty()) {
        // Return false to prevent transition
        log.warn("Transition blocked: Risk Assessment is required")
        return false
    }
}

// Allow transition
return true`,
      explanation: 'Use as a condition validator to ensure required fields are filled before transitioning.',
    },
    {
      useCase: 'Send custom notification on specific event',
      language: 'Groovy (Script Runner)',
      code: `import com.atlassian.jira.component.ComponentAccessor
import com.atlassian.jira.issue.Issue
import groovyx.net.http.HTTPBuilder
import static groovyx.net.http.Method.POST
import static groovyx.net.http.ContentType.JSON

Issue issue = issue
def http = new HTTPBuilder('https://your-webhook-endpoint.com')

def payload = [
    issue_key: issue.key,
    summary: issue.summary,
    status: issue.status.name,
    assignee: issue.assignee?.displayName ?: "Unassigned"
]

http.request(POST, JSON) {
    uri.path = '/api/notifications'
    body = payload

    response.success = { resp, json ->
        log.warn("Notification sent successfully for \${issue.key}")
    }

    response.failure = { resp ->
        log.error("Failed to send notification: HTTP \${resp.status}")
    }
}`,
      explanation: 'Sends custom webhook notifications with issue data. Use as a post-function or event listener.',
    },
  ],

  configurationGuides: [
    {
      topic: 'Setting up Script Runner post-function in workflow',
      steps: [
        'Navigate to Administration → Issues → Workflows',
        'Select the workflow and click "Edit"',
        'Choose the transition where you want to add the script',
        'Click "Post Functions" tab',
        'Click "Add post function" → "Script Runner" → "Custom script post-function"',
        'Write or paste your Groovy script in the editor',
        'Add error handling with try-catch blocks',
        'Test the script first in Script Console',
        'Click "Add" and then "Publish" the workflow',
        'Test the transition in a test project before production use',
      ],
      warnings: [
        'Always backup workflow XML before making changes',
        'Test scripts in Script Console before adding to workflows',
        'Ensure proper null checks to prevent NullPointerException',
        'Consider performance impact of complex scripts on every transition',
        'Use logging for debugging but remove verbose logs in production',
      ],
    },
    {
      topic: 'Configuring LDAP/Active Directory integration',
      steps: [
        'Go to Administration → User Management → User Directories',
        'Click "Add Directory" → "Microsoft Active Directory"',
        'Enter hostname and port (usually 389 for LDAP, 636 for LDAPS)',
        'Provide service account username and password',
        'Set Base DN (e.g., dc=company,dc=com)',
        'Configure User DN and Group DN mappings',
        'Set synchronization interval (e.g., 60 minutes)',
        'Add user/group filters if needed (e.g., (&(objectClass=user)(memberOf=CN=JiraUsers,OU=Groups,DC=company,DC=com)))',
        'Test connection before saving',
        'Perform initial synchronization and verify users appear',
      ],
      warnings: [
        'Ensure service account has read access to all user/group objects',
        'Test connectivity on port 389/636 before configuration',
        'Use secure LDAPS (port 636) for production environments',
        'Monitor first sync closely for errors',
        'Synchronization can be resource-intensive for large directories',
      ],
    },
    {
      topic: 'Creating and testing webhook integrations',
      steps: [
        'Navigate to System → WebHooks',
        'Click "Create a WebHook"',
        'Enter name and webhook URL (must be HTTPS for security)',
        'Select events to trigger webhook (e.g., Issue Created, Issue Updated)',
        'Optionally add JQL filter to limit which issues trigger webhook',
        'Save and test with a sample issue event',
        'Check webhook history for delivery status',
        'Implement idempotency on receiving end to handle duplicate deliveries',
        'Set up retry logic for failed deliveries',
        'Monitor webhook performance and adjust timeout settings',
      ],
      warnings: [
        'Webhook endpoint must respond within 10 seconds',
        'Failed webhooks are retried with exponential backoff',
        'Use JQL filters to reduce unnecessary webhook calls',
        'Ensure receiving endpoint can handle Jira webhook payload structure',
        'HTTPS is strongly recommended for security',
      ],
    },
  ],
};

/**
 * Get relevant technical procedures based on issue content
 */
export function getRelevantProcedures(keywords: string[]): TechnicalKnowledgeContext {
  const relevantDiagnostics = technicalProcedures.diagnosticProcedures.filter(proc =>
    keywords.some(keyword =>
      proc.symptom.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  const relevantScripts = technicalProcedures.scriptExamples.filter(script =>
    keywords.some(keyword =>
      script.useCase.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  const relevantGuides = technicalProcedures.configurationGuides.filter(guide =>
    keywords.some(keyword =>
      guide.topic.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  return {
    diagnosticProcedures: relevantDiagnostics.length > 0
      ? relevantDiagnostics
      : technicalProcedures.diagnosticProcedures.slice(0, 2),
    scriptExamples: relevantScripts.length > 0
      ? relevantScripts
      : technicalProcedures.scriptExamples.slice(0, 1),
    configurationGuides: relevantGuides.length > 0
      ? relevantGuides
      : technicalProcedures.configurationGuides.slice(0, 1),
  };
}
