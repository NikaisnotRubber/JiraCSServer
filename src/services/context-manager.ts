/**
 * Context Manager Service
 *
 * Manages conversation context storage and retrieval for Project IDs
 */

import { eq, desc, and, gte } from 'drizzle-orm';
import { getDatabase } from '../database/client';
import {
  projectContexts,
  conversationTurns,
  type ProjectContext,
  type NewProjectContext,
  type ConversationTurn,
  type NewConversationTurn,
  type CompressedContext,
} from '../database/schema';

export interface SaveInteractionParams {
  projectId: string;
  workflowId: string;
  userQuestion: string;
  issueType?: string;
  reporter?: string;
  classification?: string;
  classificationConfidence?: number;
  agentResponse: string;
  responseAgent?: string;
  qualityScore?: number;
  qualityFeedback?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  processingTimeMs?: number;
  metadata?: Record<string, any>;
}

export class ContextManager {
  /**
   * Get or create project context
   */
  async getProjectContext(projectId: string): Promise<ProjectContext | null> {
    try {
      const db = await getDatabase();

      const results = await db
        .select()
        .from(projectContexts)
        .where(eq(projectContexts.projectId, projectId))
        .limit(1);

      return results[0] || null;
    } catch (error: any) {
      console.error(`❌ Failed to get project context for ${projectId}:`, error?.message);
      throw error;
    }
  }

  /**
   * Create a new project context
   */
  async createProjectContext(projectId: string): Promise<ProjectContext> {
    try {
      const db = await getDatabase();

      const newContext: NewProjectContext = {
        projectId,
        compressedContext: null,
        rawHistory: [],
        totalInteractions: 0,
        totalTokens: 0,
        metadata: {},
      };

      const results = await db.insert(projectContexts).values(newContext).returning();

      console.log(`✅ Created new project context for ${projectId}`);
      return results[0];
    } catch (error: any) {
      console.error(`❌ Failed to create project context for ${projectId}:`, error?.message);
      throw error;
    }
  }

  /**
   * Save a conversation interaction
   */
  async saveInteraction(params: SaveInteractionParams): Promise<void> {
    try {
      const db = await getDatabase();

      // Ensure project context exists
      let context = await this.getProjectContext(params.projectId);
      if (!context) {
        context = await this.createProjectContext(params.projectId);
      }

      // Insert conversation turn
      const turn: NewConversationTurn = {
        projectId: params.projectId,
        workflowId: params.workflowId,
        userQuestion: params.userQuestion,
        issueType: params.issueType,
        reporter: params.reporter,
        classification: params.classification,
        classificationConfidence: params.classificationConfidence,
        agentResponse: params.agentResponse,
        responseAgent: params.responseAgent,
        qualityScore: params.qualityScore,
        qualityFeedback: params.qualityFeedback,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        totalTokens: params.totalTokens,
        processingTimeMs: params.processingTimeMs,
        metadata: params.metadata || {},
      };

      await db.insert(conversationTurns).values(turn);

      // Update project context
      const conversationTurn: ConversationTurn = {
        workflowId: params.workflowId,
        timestamp: new Date().toISOString(),
        userQuestion: params.userQuestion,
        classification: params.classification,
        agentResponse: params.agentResponse,
        qualityScore: params.qualityScore,
        tokenCount: params.totalTokens || 0,
      };

      const updatedHistory = [...(context.rawHistory || []), conversationTurn];
      const updatedTotalTokens = (context.totalTokens || 0) + (params.totalTokens || 0);

      await db
        .update(projectContexts)
        .set({
          rawHistory: updatedHistory,
          totalInteractions: (context.totalInteractions || 0) + 1,
          totalTokens: updatedTotalTokens,
          lastUpdated: new Date(),
          metadata: {
            ...(context.metadata || {}),
            lastClassification: params.classification,
          },
        })
        .where(eq(projectContexts.projectId, params.projectId));

      console.log(`✅ Saved interaction for ${params.projectId} (workflow: ${params.workflowId})`);
    } catch (error: any) {
      console.error(`❌ Failed to save interaction for ${params.projectId}:`, error?.message);
      throw error;
    }
  }

  /**
   * Update compressed context for a project
   */
  async updateCompressedContext(
    projectId: string,
    compressedContext: CompressedContext
  ): Promise<void> {
    try {
      const db = await getDatabase();

      await db
        .update(projectContexts)
        .set({
          compressedContext,
          lastUpdated: new Date(),
        })
        .where(eq(projectContexts.projectId, projectId));

      console.log(`✅ Updated compressed context for ${projectId}`);
    } catch (error: any) {
      console.error(`❌ Failed to update compressed context for ${projectId}:`, error?.message);
      throw error;
    }
  }

  /**
   * Get conversation history for a project
   */
  async getConversationHistory(
    projectId: string,
    limit?: number
  ): Promise<ConversationTurn[]> {
    try {
      const context = await this.getProjectContext(projectId);
      if (!context || !context.rawHistory) {
        return [];
      }

      const history = context.rawHistory;
      if (limit) {
        return history.slice(-limit);
      }
      return history;
    } catch (error: any) {
      console.error(`❌ Failed to get conversation history for ${projectId}:`, error?.message);
      return [];
    }
  }

  /**
   * Get recent conversation turns from database
   */
  async getRecentTurns(
    projectId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const db = await getDatabase();

      const turns = await db
        .select()
        .from(conversationTurns)
        .where(eq(conversationTurns.projectId, projectId))
        .orderBy(desc(conversationTurns.createdAt))
        .limit(limit);

      return turns.reverse(); // Return in chronological order
    } catch (error: any) {
      console.error(`❌ Failed to get recent turns for ${projectId}:`, error?.message);
      return [];
    }
  }

  /**
   * Check if compression is needed
   */
  async shouldCompress(
    projectId: string,
    turnThreshold: number,
    tokenThreshold: number
  ): Promise<boolean> {
    try {
      const context = await this.getProjectContext(projectId);
      if (!context) return false;

      const exceedsTurns = (context.totalInteractions || 0) > turnThreshold;
      const exceedsTokens = (context.totalTokens || 0) > tokenThreshold;

      return exceedsTurns || exceedsTokens;
    } catch (error: any) {
      console.error(`❌ Failed to check compression need for ${projectId}:`, error?.message);
      return false;
    }
  }

  /**
   * Get all projects that need compression
   */
  async getProjectsNeedingCompression(
    turnThreshold: number,
    tokenThreshold: number
  ): Promise<string[]> {
    try {
      const db = await getDatabase();

      const results = await db
        .select({ projectId: projectContexts.projectId })
        .from(projectContexts)
        .where(
          and(
            gte(projectContexts.totalInteractions, turnThreshold),
            // No compressed context yet
            eq(projectContexts.compressedContext, null as any)
          )
        );

      return results.map((r) => r.projectId);
    } catch (error: any) {
      console.error('❌ Failed to get projects needing compression:', error?.message);
      return [];
    }
  }

  /**
   * Delete old conversation turns (for cleanup)
   */
  async deleteOldTurns(daysToKeep: number = 90): Promise<number> {
    try {
      const db = await getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db
        .delete(conversationTurns)
        .where(gte(conversationTurns.createdAt, cutoffDate));

      console.log(`✅ Deleted old conversation turns (kept last ${daysToKeep} days)`);
      return result.rowCount || 0;
    } catch (error: any) {
      console.error('❌ Failed to delete old turns:', error?.message);
      return 0;
    }
  }

  /**
   * Get statistics for a project
   */
  async getProjectStats(projectId: string): Promise<{
    totalInteractions: number;
    totalTokens: number;
    averageQualityScore: number;
    lastInteraction: string | null;
    hasCompressedContext: boolean;
  }> {
    try {
      const context = await this.getProjectContext(projectId);
      if (!context) {
        return {
          totalInteractions: 0,
          totalTokens: 0,
          averageQualityScore: 0,
          lastInteraction: null,
          hasCompressedContext: false,
        };
      }

      const db = await getDatabase();
      const turns = await db
        .select()
        .from(conversationTurns)
        .where(eq(conversationTurns.projectId, projectId));

      const qualityScores = turns
        .map((t) => t.qualityScore)
        .filter((s): s is number => s !== null && s !== undefined);

      const averageQuality =
        qualityScores.length > 0
          ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
          : 0;

      return {
        totalInteractions: context.totalInteractions || 0,
        totalTokens: context.totalTokens || 0,
        averageQualityScore: averageQuality,
        lastInteraction: context.lastUpdated?.toISOString() || null,
        hasCompressedContext: context.compressedContext !== null,
      };
    } catch (error: any) {
      console.error(`❌ Failed to get project stats for ${projectId}:`, error?.message);
      throw error;
    }
  }
}

// Export singleton instance
export const contextManager = new ContextManager();
