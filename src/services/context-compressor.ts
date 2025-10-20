/**
 * Context Compressor Service
 *
 * Uses LLM to intelligently compress conversation history
 * while preserving key technical details and context
 */

import OpenAI from 'openai';
import { config } from '../utils/config';
import { getContextCompressionConfig } from '../database/config';
import type { ConversationTurn, CompressedContext } from '../database/schema';

export interface CompressionResult {
  compressedContext: CompressedContext;
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
}

export class ContextCompressor {
  private openai: OpenAI;
  private compressionConfig;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });
    this.compressionConfig = getContextCompressionConfig();
  }

  /**
   * Compress conversation history using LLM
   */
  async compressHistory(
    history: ConversationTurn[],
    keepRecentTurns?: number
  ): Promise<CompressionResult> {
    try {
      const recentTurns = keepRecentTurns || this.compressionConfig.keepRecentTurns;

      // Split history into "to compress" and "to keep"
      const toCompress = history.slice(0, -recentTurns);
      const toKeep = history.slice(-recentTurns);

      if (toCompress.length === 0) {
        // Nothing to compress, return minimal context
        return this.createMinimalCompression(history);
      }

      console.log(`🗜️ Compressing ${toCompress.length} conversation turns, keeping ${toKeep.length} recent`);

      // Estimate original tokens
      const originalTokens = this.estimateTokens(
        toCompress.map((t) => `Q: ${t.userQuestion}\nA: ${t.agentResponse}`).join('\n\n')
      );

      // Create compression prompt
      const compressionPrompt = this.buildCompressionPrompt(toCompress);

      // Call LLM for compression
      const completion = await this.openai.chat.completions.create({
        model: this.compressionConfig.compressionModel,
        messages: [
          {
            role: 'system',
            content: this.getCompressionSystemPrompt(),
          },
          {
            role: 'user',
            content: compressionPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: this.compressionConfig.maxCompressedTokens,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from LLM compression');
      }

      const compressionData = JSON.parse(responseContent);

      // Build compressed context
      const compressedContext: CompressedContext = {
        summary: compressionData.summary || '',
        keyDetails: compressionData.keyDetails || [],
        unresolvedIssues: compressionData.unresolvedIssues || [],
        decisions: compressionData.decisions || [],
        compressedAt: new Date().toISOString(),
        tokenCount: this.estimateTokens(JSON.stringify(compressionData)),
      };

      const compressedTokens = compressedContext.tokenCount;
      const compressionRatio = Math.round((1 - compressedTokens / originalTokens) * 100);

      console.log(
        `✅ Compression complete: ${originalTokens} → ${compressedTokens} tokens (${compressionRatio}% reduction)`
      );

      return {
        compressedContext,
        originalTokens,
        compressedTokens,
        compressionRatio,
      };
    } catch (error: any) {
      console.error('❌ Compression failed:', error?.message);
      // Fallback to simple compression
      return this.createFallbackCompression(history);
    }
  }

  /**
   * Get system prompt for compression
   */
  private getCompressionSystemPrompt(): string {
    return `You are an expert at summarizing technical support conversations for Jira customer service.

Your task is to compress conversation history while preserving:
1. **Key technical details** (error messages, system configurations, version numbers, etc.)
2. **Unresolved issues** that are still being worked on
3. **Important decisions** or solutions that were provided
4. **Context** necessary to understand follow-up questions

Output a JSON object with this structure:
{
  "summary": "Brief overall summary of the conversation (2-3 sentences)",
  "keyDetails": ["List of important technical details to remember"],
  "unresolvedIssues": ["List of issues that are still open or pending"],
  "decisions": ["List of solutions or decisions made"]
}

Be concise but preserve critical information. Focus on technical accuracy.`;
  }

  /**
   * Build compression prompt from conversation turns
   */
  private buildCompressionPrompt(turns: ConversationTurn[]): string {
    const conversationText = turns
      .map((turn, index) => {
        let text = `### Turn ${index + 1} (${turn.timestamp})\n`;
        text += `**User Question:** ${turn.userQuestion}\n`;
        if (turn.classification) {
          text += `**Classification:** ${turn.classification}\n`;
        }
        text += `**Agent Response:** ${turn.agentResponse}\n`;
        if (turn.qualityScore !== undefined && turn.qualityScore !== null) {
          text += `**Quality Score:** ${turn.qualityScore}\n`;
        }
        return text;
      })
      .join('\n---\n\n');

    return `Please compress the following conversation history:\n\n${conversationText}\n\nProvide the compressed summary as JSON.`;
  }

  /**
   * Create minimal compression for short histories
   */
  private createMinimalCompression(history: ConversationTurn[]): CompressionResult {
    const summary = `Short conversation with ${history.length} turn(s)`;
    const tokens = this.estimateTokens(JSON.stringify(history));

    const compressedContext: CompressedContext = {
      summary,
      keyDetails: [],
      unresolvedIssues: [],
      decisions: [],
      compressedAt: new Date().toISOString(),
      tokenCount: Math.round(tokens * 0.5), // Estimate 50% compression
    };

    return {
      compressedContext,
      originalTokens: tokens,
      compressedTokens: compressedContext.tokenCount,
      compressionRatio: 50,
    };
  }

  /**
   * Create fallback compression if LLM fails
   */
  private createFallbackCompression(history: ConversationTurn[]): CompressionResult {
    const tokens = this.estimateTokens(JSON.stringify(history));

    // Simple fallback: extract questions and classifications
    const summary = `Conversation with ${history.length} turns covering topics: ${this.extractTopics(history).join(', ')}`;

    const keyDetails = history
      .filter((t) => t.classification)
      .map((t) => `${t.classification}: ${t.userQuestion.substring(0, 100)}`);

    const compressedContext: CompressedContext = {
      summary,
      keyDetails: keyDetails.slice(0, 5),
      unresolvedIssues: [],
      decisions: [],
      compressedAt: new Date().toISOString(),
      tokenCount: this.estimateTokens(summary + keyDetails.join(' ')),
    };

    return {
      compressedContext,
      originalTokens: tokens,
      compressedTokens: compressedContext.tokenCount,
      compressionRatio: Math.round((1 - compressedContext.tokenCount / tokens) * 100),
    };
  }

  /**
   * Extract topics from conversation history
   */
  private extractTopics(history: ConversationTurn[]): string[] {
    const classifications = history
      .map((t) => t.classification)
      .filter((c): c is string => c !== undefined && c !== null);

    const uniqueClassifications = Array.from(new Set(classifications));
    return uniqueClassifications.length > 0 ? uniqueClassifications : ['general support'];
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Merge existing compressed context with new compression
   */
  async mergeCompressedContexts(
    existing: CompressedContext | null,
    newCompression: CompressedContext
  ): Promise<CompressedContext> {
    if (!existing) {
      return newCompression;
    }

    // Merge summaries
    const mergedSummary = `${existing.summary}\n\nRecent update: ${newCompression.summary}`;

    // Merge and deduplicate arrays
    const mergedKeyDetails = Array.from(
      new Set([...existing.keyDetails, ...newCompression.keyDetails])
    );
    const mergedUnresolved = Array.from(
      new Set([...existing.unresolvedIssues, ...newCompression.unresolvedIssues])
    );
    const mergedDecisions = Array.from(
      new Set([...existing.decisions, ...newCompression.decisions])
    );

    const merged: CompressedContext = {
      summary: mergedSummary,
      keyDetails: mergedKeyDetails.slice(-10), // Keep last 10
      unresolvedIssues: mergedUnresolved.slice(-5), // Keep last 5
      decisions: mergedDecisions.slice(-10), // Keep last 10
      compressedAt: new Date().toISOString(),
      tokenCount: this.estimateTokens(
        mergedSummary + mergedKeyDetails.join(' ') + mergedUnresolved.join(' ') + mergedDecisions.join(' ')
      ),
    };

    return merged;
  }

  /**
   * Check if compression would be beneficial
   */
  wouldBenefitFromCompression(
    history: ConversationTurn[],
    currentCompressed: CompressedContext | null
  ): boolean {
    const historyTokens = this.estimateTokens(JSON.stringify(history));
    const compressedTokens = currentCompressed?.tokenCount || 0;

    // Benefit if history is 2x larger than compressed version
    return historyTokens > compressedTokens * 2;
  }
}

// Export singleton instance
export const contextCompressor = new ContextCompressor();
