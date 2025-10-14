// Extended Issue Type System for Different Spaces

/**
 * Space types representing different Jira/Confluence spaces
 */
export type SpaceType = 'corp' | 'confluence' | 'ext' | 'jira';

/**
 * Request types based on user needs
 * Different spaces may support different request types
 */
export enum RequestType {
  // Common across all spaces
  NEW_ACCOUNT = 'new_account',           // 新賬號授權 (conf, ext only)
  LOGIN = 'login',                       // 登入
  PERMISSION = 'permission',             // 權限
  NEW_SPACE = 'new_space',              // 新空間申請
  CONSULTATION = 'consultation',         // 咨詢
  WISH_POOL = 'wish_pool',              // 許願池
  OTHER = 'other',                      // 其他

  // Jira-specific
  FIELD_SETUP = 'field_setup',          // 欄位設置 (jira only)
  WORKFLOW = 'workflow',                // 工作流程 (jira only)
}

/**
 * Extended Jira Issue Input with new field structure
 */
export interface ExtendedJiraIssueInput {
  forms: {
    // Core fields
    'Project ID': string;
    'Issue Type': string;
    'Reporter': string;
    'Created': string;
    'Updated': string;
    'Summary': string;

    // Extended fields
    'Space Type': SpaceType;
    'Request Type': RequestType;
    'Is Batch Request': boolean;
    'User Signature'?: string;  // Optional: for anonymous submissions
    'Anonymous Submission': boolean;

    Comment: {
      Created: string;
      Updated: string;
      Content: string;
    };

    // Custom metadata
    metadata?: {
      department?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      tags?: string[];
      related_issues?: string[];
      attachments?: string[];
    };
  };
}

/**
 * Request type validation configuration
 * Defines which request types are available for each space
 */
export const SPACE_REQUEST_TYPE_MAP: Record<SpaceType, RequestType[]> = {
  corp: [
    RequestType.NEW_ACCOUNT,
    RequestType.LOGIN,
    RequestType.PERMISSION,
    RequestType.NEW_SPACE,
    RequestType.CONSULTATION,
    RequestType.WISH_POOL,
    RequestType.OTHER,
  ],
  confluence: [
    RequestType.NEW_ACCOUNT,
    RequestType.LOGIN,
    RequestType.PERMISSION,
    RequestType.NEW_SPACE,
    RequestType.CONSULTATION,
    RequestType.WISH_POOL,
    RequestType.OTHER,
  ],
  ext: [
    RequestType.NEW_ACCOUNT,
    RequestType.LOGIN,
    RequestType.PERMISSION,
    RequestType.NEW_SPACE,
    RequestType.CONSULTATION,
    RequestType.WISH_POOL,
    RequestType.OTHER,
  ],
  jira: [
    RequestType.LOGIN,
    RequestType.PERMISSION,
    RequestType.FIELD_SETUP,
    RequestType.WORKFLOW,
    RequestType.NEW_SPACE,
    RequestType.CONSULTATION,
    RequestType.WISH_POOL,
    RequestType.OTHER,
  ],
};

/**
 * Field configuration for different request types
 */
export interface RequestTypeFieldConfig {
  required_fields: string[];
  optional_fields: string[];
  validation_rules: Record<string, any>;
  handler_type: 'simple' | 'complex' | 'general';
}

export const REQUEST_TYPE_FIELD_CONFIG: Record<RequestType, RequestTypeFieldConfig> = {
  [RequestType.NEW_ACCOUNT]: {
    required_fields: ['Reporter', 'Space Type', 'User Signature'],
    optional_fields: ['department', 'manager_approval'],
    validation_rules: {
      space_type: ['confluence', 'ext'], // Only available for conf & ext
    },
    handler_type: 'simple',
  },
  [RequestType.LOGIN]: {
    required_fields: ['Reporter', 'Summary', 'Comment'],
    optional_fields: ['error_message', 'screenshot'],
    validation_rules: {},
    handler_type: 'simple',
  },
  [RequestType.PERMISSION]: {
    required_fields: ['Reporter', 'Summary', 'target_resource'],
    optional_fields: ['permission_level', 'justification'],
    validation_rules: {},
    handler_type: 'complex',
  },
  [RequestType.FIELD_SETUP]: {
    required_fields: ['Reporter', 'Summary', 'field_name', 'field_type'],
    optional_fields: ['default_value', 'validation_rules'],
    validation_rules: {
      space_type: ['jira'], // Only available for Jira
    },
    handler_type: 'complex',
  },
  [RequestType.WORKFLOW]: {
    required_fields: ['Reporter', 'Summary', 'workflow_name'],
    optional_fields: ['workflow_steps', 'approval_chain'],
    validation_rules: {
      space_type: ['jira'], // Only available for Jira
    },
    handler_type: 'complex',
  },
  [RequestType.NEW_SPACE]: {
    required_fields: ['Reporter', 'Summary', 'space_name', 'space_purpose'],
    optional_fields: ['team_members', 'manager_approval'],
    validation_rules: {},
    handler_type: 'complex',
  },
  [RequestType.CONSULTATION]: {
    required_fields: ['Reporter', 'Summary', 'Comment'],
    optional_fields: [],
    validation_rules: {},
    handler_type: 'general',
  },
  [RequestType.WISH_POOL]: {
    required_fields: ['Reporter', 'Summary', 'feature_description'],
    optional_fields: ['expected_benefit', 'priority', 'attachments'],
    validation_rules: {
      forward_to_pm: true, // Auto-forward to PM
    },
    handler_type: 'general',
  },
  [RequestType.OTHER]: {
    required_fields: ['Reporter', 'Summary', 'Comment'],
    optional_fields: [],
    validation_rules: {},
    handler_type: 'general',
  },
};

/**
 * Post-process input for handling follow-up questions
 */
export interface PostProcessInput {
  original_issue_key: string;
  workflow_id: string;
  follow_up_content: string;
  user: string;
  timestamp: string;
  context?: {
    previous_response?: string;
    conversation_history?: Array<{
      role: 'user' | 'agent';
      content: string;
      timestamp: string;
    }>;
  };
}

/**
 * Work summary statistics for reporting
 */
export interface WorkSummaryStats {
  date: string;
  period: 'daily' | 'weekly' | 'monthly';
  total_cases: number;
  completed_cases: number;
  in_progress_cases: number;
  pending_cases: number;
  by_request_type: Record<RequestType, number>;
  by_space: Record<SpaceType, number>;
  average_resolution_time: number;
  quality_scores: {
    average: number;
    distribution: Record<string, number>;
  };
  top_issues?: Array<{
    issue_key: string;
    summary: string;
    request_type: RequestType;
    status: string;
  }>;
}

/**
 * Batch request processing options (extended)
 */
export interface ExtendedBatchOptions {
  parallel: boolean;
  max_concurrent?: number;
  stop_on_error?: boolean;
  group_by_space?: boolean;
  priority_order?: 'fifo' | 'priority' | 'space';
}
