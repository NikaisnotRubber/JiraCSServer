/**
 * Database Schema Definitions using Drizzle ORM
 *
 * Defines tables for storing conversation context with Project ID indexing
 */

import { pgTable, uuid, varchar, text, jsonb, integer, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Project Contexts Table
 *
 * Stores compressed conversation context for each Project ID
 */
export const projectContexts = pgTable(
  'project_contexts',
  {
    projectId: varchar('project_id', { length: 50 }).primaryKey().notNull(),

    // Compressed context data
    compressedContext: jsonb('compressed_context').$type<CompressedContext>(),

    // Full conversation history (for reference and re-compression)
    rawHistory: jsonb('raw_history').$type<ConversationTurn[]>().default(sql`'[]'::jsonb`).notNull(),

    // Metadata
    totalInteractions: integer('total_interactions').default(0).notNull(),
    totalTokens: integer('total_tokens').default(0).notNull(),

    // Timestamps
    lastUpdated: timestamp('last_updated', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),

    // Additional metadata
    metadata: jsonb('metadata').$type<ProjectMetadata>().default(sql`'{}'::jsonb`).notNull(),
  },
  (table) => ({
    lastUpdatedIdx: index('idx_project_contexts_last_updated').on(table.lastUpdated),
  })
);

/**
 * Conversation Turns Table
 *
 * Detailed record of each conversation turn
 */
export const conversationTurns = pgTable(
  'conversation_turns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: varchar('project_id', { length: 50 })
      .notNull()
      .references(() => projectContexts.projectId, { onDelete: 'cascade' }),

    // Workflow information
    workflowId: varchar('workflow_id', { length: 100 }).notNull(),

    // User input
    userQuestion: text('user_question').notNull(),
    issueType: varchar('issue_type', { length: 50 }),
    reporter: varchar('reporter', { length: 100 }),

    // Classification
    classification: varchar('classification', { length: 20 }),
    classificationConfidence: integer('classification_confidence'),

    // Agent response
    agentResponse: text('agent_response').notNull(),
    responseAgent: varchar('response_agent', { length: 50 }),

    // Quality metrics
    qualityScore: integer('quality_score'),
    qualityFeedback: text('quality_feedback'),

    // Token usage
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    totalTokens: integer('total_tokens'),

    // Processing metadata
    processingTimeMs: integer('processing_time_ms'),

    // Timestamps
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),

    // Additional metadata
    metadata: jsonb('metadata').$type<Record<string, any>>().default(sql`'{}'::jsonb`),
  },
  (table) => ({
    projectIdIdx: index('idx_conversation_turns_project_id').on(table.projectId),
    createdAtIdx: index('idx_conversation_turns_created_at').on(table.createdAt),
    workflowIdIdx: index('idx_conversation_turns_workflow_id').on(table.workflowId),
  })
);

/**
 * Context Compression History Table
 *
 * Tracks compression operations for debugging and analytics
 */
export const compressionHistory = pgTable(
  'compression_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: varchar('project_id', { length: 50 })
      .notNull()
      .references(() => projectContexts.projectId, { onDelete: 'cascade' }),

    // Compression details
    originalTurns: integer('original_turns').notNull(),
    originalTokens: integer('original_tokens').notNull(),
    compressedTokens: integer('compressed_tokens').notNull(),
    compressionRatio: integer('compression_ratio').notNull(), // Percentage

    // Compression strategy used
    strategy: varchar('strategy', { length: 50 }).notNull(),
    model: varchar('model', { length: 50 }).notNull(),

    // Result
    compressedContent: text('compressed_content').notNull(),

    // Timestamp
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    projectIdIdx: index('idx_compression_history_project_id').on(table.projectId),
    createdAtIdx: index('idx_compression_history_created_at').on(table.createdAt),
  })
);

// Type definitions for JSONB columns

/**
 * Compressed context structure
 */
export interface CompressedContext {
  /** Summary of conversation history */
  summary: string;

  /** Key technical details to preserve */
  keyDetails: string[];

  /** Unresolved issues or ongoing topics */
  unresolvedIssues: string[];

  /** Important decisions or solutions */
  decisions: string[];

  /** Compressed timestamp */
  compressedAt: string;

  /** Token count of compressed content */
  tokenCount: number;
}

/**
 * Individual conversation turn
 */
export interface ConversationTurn {
  workflowId: string;
  timestamp: string;
  userQuestion: string;
  classification?: string;
  agentResponse: string;
  qualityScore?: number;
  tokenCount: number;
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  lastClassification?: string;
  commonIssueTypes?: string[];
  averageQualityScore?: number;
  totalProcessingTimeMs?: number;
  notes?: string;
}

// Export table types for use in queries
export type ProjectContext = typeof projectContexts.$inferSelect;
export type NewProjectContext = typeof projectContexts.$inferInsert;

export type ConversationTurnRecord = typeof conversationTurns.$inferSelect;
export type NewConversationTurn = typeof conversationTurns.$inferInsert;

export type CompressionHistoryRecord = typeof compressionHistory.$inferSelect;
export type NewCompressionHistory = typeof compressionHistory.$inferInsert;
