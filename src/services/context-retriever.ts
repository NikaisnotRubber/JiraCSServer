/**
 * Context Retriever Service
 *
 * Retrieves and formats historical context for injection into prompts
 */

import { contextManager } from './context-manager';
import { contextCompressor } from './context-compressor';
import { getContextCompressionConfig } from '../database/config';
import type { CompressedContext, ConversationTurn } from '../database/schema';

export interface RetrievedContext {
  /** Compressed summary of older conversations */
  compressedSummary: string | null;

  /** Recent full conversation turns */
  recentTurns: Array<{
    timestamp: string;
    question: string;
    response: string;
    classification?: string;
  }>;

  /** Project statistics */
  stats: {
    totalInteractions: number;
    hasHistory: boolean;
  };

  /** Formatted context ready for prompt injection */
  formattedContext: string;
}

export class ContextRetriever {
  private compressionConfig;

  constructor() {
    this.compressionConfig = getContextCompressionConfig();
  }

  /**
   * Retrieve full context for a project ID
   */
  async retrieveContext(projectId: string): Promise<RetrievedContext> {
    try {
      console.log(`📥 Retrieving context for project ${projectId}`);

      // Get project context
      const projectContext = await contextManager.getProjectContext(projectId);

      if (!projectContext) {
        console.log(`📭 No existing context for project ${projectId}`);
        return this.createEmptyContext();
      }

      // Get recent conversation turns
      const recentTurns = await this.getFormattedRecentTurns(
        projectContext.rawHistory || [],
        this.compressionConfig.keepRecentTurns
      );

      // Get compressed summary if available
      const compressedSummary = projectContext.compressedContext
        ? this.formatCompressedContext(projectContext.compressedContext)
        : null;

      // Build formatted context
      const formattedContext = this.buildFormattedContext(compressedSummary, recentTurns);

      const result: RetrievedContext = {
        compressedSummary,
        recentTurns,
        stats: {
          totalInteractions: projectContext.totalInteractions || 0,
          hasHistory: (projectContext.totalInteractions || 0) > 0,
        },
        formattedContext,
      };

      console.log(
        `✅ Retrieved context for ${projectId}: ${result.stats.totalInteractions} total interactions, ${recentTurns.length} recent turns`
      );

      return result;
    } catch (error: any) {
      console.error(`❌ Failed to retrieve context for ${projectId}:`, error?.message);
      return this.createEmptyContext();
    }
  }

  /**
   * Get formatted recent conversation turns
   */
  private async getFormattedRecentTurns(
    rawHistory: ConversationTurn[],
    keepRecentTurns: number
  ): Promise<
    Array<{
      timestamp: string;
      question: string;
      response: string;
      classification?: string;
    }>
  > {
    const recentHistory = rawHistory.slice(-keepRecentTurns);

    return recentHistory.map((turn) => ({
      timestamp: turn.timestamp,
      question: turn.userQuestion,
      response: turn.agentResponse,
      classification: turn.classification,
    }));
  }

  /**
   * Format compressed context for display
   */
  private formatCompressedContext(compressed: CompressedContext): string {
    const sections: string[] = [];

    sections.push(`**Summary:** ${compressed.summary}`);

    if (compressed.keyDetails.length > 0) {
      sections.push(`**Key Details:**`);
      compressed.keyDetails.forEach((detail) => {
        sections.push(`  - ${detail}`);
      });
    }

    if (compressed.unresolvedIssues.length > 0) {
      sections.push(`**Unresolved Issues:**`);
      compressed.unresolvedIssues.forEach((issue) => {
        sections.push(`  - ${issue}`);
      });
    }

    if (compressed.decisions.length > 0) {
      sections.push(`**Previous Decisions/Solutions:**`);
      compressed.decisions.forEach((decision) => {
        sections.push(`  - ${decision}`);
      });
    }

    return sections.join('\n');
  }

  /**
   * Build formatted context for prompt injection
   */
  private buildFormattedContext(
    compressedSummary: string | null,
    recentTurns: Array<{
      timestamp: string;
      question: string;
      response: string;
      classification?: string;
    }>
  ): string {
    const sections: string[] = [];

    sections.push('## 📜 Historical Context\n');

    if (compressedSummary) {
      sections.push('### Previous Conversation Summary\n');
      sections.push(compressedSummary);
      sections.push('');
    }

    if (recentTurns.length > 0) {
      sections.push('### Recent Conversation History\n');

      recentTurns.forEach((turn, index) => {
        sections.push(`**Turn ${index + 1}** (${new Date(turn.timestamp).toLocaleString()})`);
        if (turn.classification) {
          sections.push(`*Classification: ${turn.classification}*`);
        }
        sections.push(`**User:** ${turn.question}`);
        sections.push(`**Agent:** ${turn.response}`);
        sections.push('');
      });
    }

    if (!compressedSummary && recentTurns.length === 0) {
      sections.push('*No previous conversation history for this project.*');
    }

    return sections.join('\n');
  }

  /**
   * Create empty context
   */
  private createEmptyContext(): RetrievedContext {
    return {
      compressedSummary: null,
      recentTurns: [],
      stats: {
        totalInteractions: 0,
        hasHistory: false,
      },
      formattedContext: '## 📜 Historical Context\n\n*This is a new conversation with no previous history.*',
    };
  }

  /**
   * Trigger compression if needed
   */
  async triggerCompressionIfNeeded(projectId: string): Promise<void> {
    try {
      const shouldCompress = await contextManager.shouldCompress(
        projectId,
        this.compressionConfig.turnThreshold,
        this.compressionConfig.tokenThreshold
      );

      if (!shouldCompress) {
        return;
      }

      console.log(`🗜️ Context compression needed for project ${projectId}`);

      const projectContext = await contextManager.getProjectContext(projectId);
      if (!projectContext || !projectContext.rawHistory) {
        return;
      }

      // Perform compression
      const compressionResult = await contextCompressor.compressHistory(
        projectContext.rawHistory,
        this.compressionConfig.keepRecentTurns
      );

      // Merge with existing compressed context if any
      const mergedContext = await contextCompressor.mergeCompressedContexts(
        projectContext.compressedContext,
        compressionResult.compressedContext
      );

      // Update database
      await contextManager.updateCompressedContext(projectId, mergedContext);

      console.log(
        `✅ Context compressed for ${projectId}: ${compressionResult.compressionRatio}% reduction`
      );
    } catch (error: any) {
      console.error(`❌ Failed to trigger compression for ${projectId}:`, error?.message);
    }
  }

  /**
   * Get context summary for logging/debugging
   */
  async getContextSummary(projectId: string): Promise<string> {
    const context = await this.retrieveContext(projectId);

    if (!context.stats.hasHistory) {
      return `No history for ${projectId}`;
    }

    return `${projectId}: ${context.stats.totalInteractions} interactions, ${context.recentTurns.length} recent turns, ${context.compressedSummary ? 'has' : 'no'} compressed summary`;
  }

  /**
   * Build context string for workflow state
   */
  async buildContextForState(projectId: string): Promise<{
    hasHistory: boolean;
    contextSummary: string;
    formattedContext: string;
  }> {
    const context = await this.retrieveContext(projectId);

    return {
      hasHistory: context.stats.hasHistory,
      contextSummary: await this.getContextSummary(projectId),
      formattedContext: context.formattedContext,
    };
  }
}

// Export singleton instance
export const contextRetriever = new ContextRetriever();
