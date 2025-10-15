import { TroubleshootingContext } from '../templates/base-template';

/**
 * Troubleshooting Guides Knowledge Base
 *
 * Comprehensive error patterns, root causes, and solutions for common
 * Jira issues. This enables multi-hop reasoning by providing:
 * - Symptom → Root Cause → Solution chains
 * - Escalation criteria for complex cases
 */

export const troubleshootingGuides: TroubleshootingContext = {
  errorPatterns: [
    {
      errorType: 'NullPointerException in Script Runner',
      symptoms: [
        'Workflow transition fails with 500 error',
        'Error log shows java.lang.NullPointerException',
        'Script worked before but now failing',
        'Issue occurs only for specific issue types or projects',
      ],
      rootCauses: [
        'Accessing a custom field that does not exist in the current context',
        'Attempting to call methods on null objects without null checks',
        'Field configuration changed (field removed from screen/context)',
        'Script assumes certain fields are always populated',
        'Issue type or project does not have the expected field configured',
      ],
      solutions: [
        'Add null checks before accessing objects: if (object != null) { ... }',
        'Use Groovy safe navigation operator: object?.property',
        'Verify custom field exists and is configured for the issue type',
        'Add logging to identify which object is null: log.warn("Debug: field = ${field}")',
        'Test script in Script Console with sample issues before deploying',
        'Implement defensive programming with try-catch blocks',
      ],
    },
    {
      errorType: 'LDAP Synchronization Failure',
      symptoms: [
        'Users not appearing in Jira after LDAP sync',
        'Group memberships not updating',
        'Sync completes but with warnings',
        'Connection test succeeds but sync fails',
      ],
      rootCauses: [
        'Incorrect Base DN configuration',
        'Service account lacks sufficient read permissions in Active Directory',
        'User/Group DN filters excluding the target users',
        'Firewall blocking LDAP port (389/636) intermittently',
        'LDAP server timeout due to large directory size',
        'Nested groups not properly configured',
        'User attribute mappings incorrect',
      ],
      solutions: [
        'Verify Base DN: Run ldapsearch to confirm DN structure',
        'Grant service account Domain Users read permissions',
        'Test LDAP filters independently to ensure they match intended users',
        'Check firewall logs for dropped connections on port 389/636',
        'Increase LDAP timeout in Jira configuration',
        'Enable nested group support if using AD nested groups',
        'Review user attribute mappings (cn, sAMAccountName, mail)',
        'Perform incremental sync with small user sets first',
      ],
    },
    {
      errorType: 'REST API Authentication Failures',
      symptoms: [
        'API calls return 401 Unauthorized',
        'Previously working integrations suddenly fail',
        'Authentication works in Postman but fails in application',
        'Some API endpoints work, others return 401',
      ],
      rootCauses: [
        'Using password instead of API token for Jira Cloud',
        'API token expired or revoked',
        'Incorrect Base64 encoding of credentials',
        'Missing or malformed Authorization header',
        'User account locked or permissions changed',
        'OAuth token expired (for OAuth-based integrations)',
        'IP whitelist blocking requests',
      ],
      solutions: [
        'For Jira Cloud: Generate new API token and use email:token format',
        'Verify Base64 encoding: echo -n "email:token" | base64',
        'Check Authorization header format: "Basic <base64_credentials>"',
        'Test with curl to isolate application vs. Jira issue',
        'Verify user account status and permissions in Jira',
        'For OAuth: Refresh OAuth token using refresh_token flow',
        'Check IP whitelist settings in Jira admin',
        'Review Jira audit logs for authentication attempts',
      ],
    },
    {
      errorType: 'Webhook Delivery Failures',
      symptoms: [
        'Webhooks not triggering on events',
        'Webhook history shows failed deliveries',
        'Intermittent webhook delivery',
        'Webhook fires but receiving system sees no data',
      ],
      rootCauses: [
        'Receiving endpoint unreachable from Jira server',
        'SSL certificate issues with HTTPS endpoint',
        'Endpoint timeout (takes longer than 10 seconds to respond)',
        'Firewall blocking outbound connections from Jira',
        'Webhook endpoint returns non-2xx status code',
        'JQL filter in webhook configuration excluding events',
        'Receiving endpoint crashes on payload processing',
      ],
      solutions: [
        'Test endpoint connectivity: curl -X POST https://endpoint from Jira server',
        'Ensure endpoint returns 200 OK within 10 seconds',
        'Verify SSL certificate is valid and trusted',
        'Check firewall allows outbound HTTPS from Jira server',
        'Review webhook execution history in Jira for detailed errors',
        'Simplify or remove JQL filters to test if events are being excluded',
        'Implement webhook retry logic and idempotency on receiving end',
        'Add endpoint monitoring and alerting',
        'Log webhook payloads for debugging',
      ],
    },
    {
      errorType: 'Custom Field Not Visible',
      symptoms: [
        'Custom field does not appear on issue screen',
        'Field visible for some issue types but not others',
        'Field appears on Create screen but not Edit screen',
        'API returns field data but UI does not show it',
      ],
      rootCauses: [
        'Field not added to the relevant screen',
        'Field context does not include the target project/issue type',
        'Field configuration scheme not associated with project',
        'Screen scheme mapping incorrect for issue type',
        'Field hidden by workflow conditions',
        'Permission restrictions on field visibility',
      ],
      solutions: [
        'Add field to screen: Administration → Issues → Screens → [Screen] → Add Field',
        'Update field context: Custom Fields → [Field] → Contexts → Edit Context',
        'Verify field configuration scheme includes the field',
        'Check screen scheme mappings for issue type operations (Create/Edit/View)',
        'Review workflow transition screens',
        'Check field-level permissions in permission scheme',
        'Clear browser cache after screen changes',
      ],
    },
    {
      errorType: 'JQL Query Performance Issues',
      symptoms: [
        'JQL query takes very long to execute',
        'Filter times out with large result sets',
        'Dashboard gadgets show spinning loader indefinitely',
        'Jira becomes slow when running specific filters',
      ],
      rootCauses: [
        'Query searches across too many projects',
        'Using functions that scan all issues (e.g., issueFunction in linkedIssuesOf())',
        'Complex custom field queries without proper indexing',
        'OR conditions expanding result set too broadly',
        'Querying archived projects',
        'Missing JQL function optimization',
      ],
      solutions: [
        'Limit query scope: Add project IN (PROJ1, PROJ2) clause',
        'Use indexed fields when possible (status, assignee, reporter)',
        'Replace broad OR with multiple specific queries',
        'Avoid functions like issueFunction for large datasets',
        'Exclude archived projects: Add AND archived = false',
        'Use saved filters instead of recalculating complex queries',
        'Re-index Jira if custom fields are not performing: Administration → System → Indexing',
        'Consider database query optimization for extreme cases',
      ],
    },
    {
      errorType: 'Workflow Transition Not Appearing',
      symptoms: [
        'Expected workflow transition button not visible',
        'Transition available for some users but not others',
        'Transition missing after workflow change',
        'Transition appears in workflow designer but not on issue',
      ],
      rootCauses: [
        'Workflow condition preventing transition for current user/issue state',
        'User lacks permission to execute transition',
        'Required fields on transition screen not populated',
        'Workflow not published after changes',
        'Issue status does not have the transition defined',
        'Workflow scheme not active for the project',
      ],
      solutions: [
        'Check workflow conditions on the transition',
        'Verify user has "Transition Issues" permission',
        'Review required fields on transition screen',
        'Publish workflow after making changes',
        'Confirm issue current status has the transition configured',
        'Verify correct workflow scheme is active: Project Settings → Workflows',
        'Test with admin account to isolate permission issues',
      ],
    },
  ],

  escalationCriteria: [
    {
      condition: 'Database corruption or data loss reported',
      action: 'Immediately escalate to Senior DBA and create critical incident ticket',
    },
    {
      condition: 'Security vulnerability or potential breach detected',
      action: 'Escalate to Security Team and disable affected integration immediately',
    },
    {
      condition: 'Production outage affecting multiple users for >30 minutes',
      action: 'Engage Incident Commander and start incident response procedure',
    },
    {
      condition: 'Script Runner script causing performance degradation system-wide',
      action: 'Disable problematic script immediately and escalate to Development Team',
    },
    {
      condition: 'LDAP sync causing account lockouts or permission issues',
      action: 'Pause LDAP sync and escalate to Infrastructure Team',
    },
    {
      condition: 'Custom requirement beyond standard Jira capabilities',
      action: 'Escalate to Solutions Architect for custom development evaluation',
    },
    {
      condition: 'Repeated failures after following all troubleshooting steps',
      action: 'Escalate to Tier 2 Support with full diagnostic logs and steps attempted',
    },
    {
      condition: 'Request involves modifying production database directly',
      action: 'Escalate to DBA with change request and rollback plan',
    },
    {
      condition: 'Issue requires Atlassian Support involvement',
      action: 'Create Atlassian Support ticket and provide reference to customer',
    },
  ],
};

/**
 * Find relevant error patterns based on keywords
 */
export function findRelevantErrors(keywords: string[]): TroubleshootingContext['errorPatterns'] {
  return troubleshootingGuides.errorPatterns.filter(error =>
    keywords.some(keyword =>
      error.errorType.toLowerCase().includes(keyword.toLowerCase()) ||
      error.symptoms.some(symptom => symptom.toLowerCase().includes(keyword.toLowerCase()))
    )
  );
}

/**
 * Check if issue meets escalation criteria
 */
export function checkEscalationNeeded(issueDescription: string): {
  shouldEscalate: boolean;
  criteria?: typeof troubleshootingGuides.escalationCriteria[0];
} {
  const desc = issueDescription.toLowerCase();

  for (const criterion of troubleshootingGuides.escalationCriteria) {
    const keywords = criterion.condition.toLowerCase().split(' ');
    const matchCount = keywords.filter(kw => desc.includes(kw)).length;

    // If more than 50% of keywords match, consider escalation
    if (matchCount / keywords.length > 0.5) {
      return {
        shouldEscalate: true,
        criteria: criterion,
      };
    }
  }

  return { shouldEscalate: false };
}
