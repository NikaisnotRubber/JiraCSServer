import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { getDatabaseConfig } from "../database/config.js";

/**
 * LangGraph Checkpoint Saver Configuration
 *
 * This module provides PostgreSQL-backed checkpoint persistence for LangGraph workflows.
 * LangMem (LangGraph's native memory) automatically manages conversation context using
 * thread_id (Project ID in our case) to maintain state across multiple interactions.
 *
 * Features:
 * - Automatic checkpoint table creation
 * - Thread-based conversation persistence
 * - Built-in state management (no custom compression needed)
 */

let checkpointerInstance: PostgresSaver | null = null;

/**
 * Create and initialize PostgresSaver for LangGraph checkpointing
 *
 * @returns Initialized PostgresSaver instance
 * @throws Error if database connection fails
 */
export async function createCheckpointer(): Promise<PostgresSaver> {
  // Return existing instance if already initialized
  if (checkpointerInstance) {
    return checkpointerInstance;
  }

  try {
    const dbConfig = getDatabaseConfig();

    // Build connection string
    const connectionString = process.env.DATABASE_URL ||
      `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

    console.log('🔗 Initializing LangGraph checkpoint saver...');

    // Create PostgresSaver from connection string
    checkpointerInstance = PostgresSaver.fromConnString(connectionString);

    // Setup creates necessary checkpoint tables automatically
    // Tables: checkpoints, checkpoint_writes, checkpoint_blobs
    await checkpointerInstance.setup();

    console.log('✅ LangGraph checkpoint saver initialized successfully');

    return checkpointerInstance;
  } catch (error) {
    console.error('❌ Failed to initialize checkpoint saver:', error);
    throw new Error(`Checkpoint saver initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get existing checkpointer instance (must call createCheckpointer first)
 *
 * @returns Existing PostgresSaver instance or null
 */
export function getCheckpointer(): PostgresSaver | null {
  return checkpointerInstance;
}

/**
 * Close checkpoint saver and release database connections
 */
export async function closeCheckpointer(): Promise<void> {
  if (checkpointerInstance) {
    console.log('🔒 Closing checkpoint saver...');
    // PostgresSaver doesn't have explicit close, but we reset the instance
    checkpointerInstance = null;
    console.log('✅ Checkpoint saver closed');
  }
}

/**
 * Generate thread_id from Project ID for LangGraph checkpointing
 *
 * Thread ID is used by LangGraph to maintain conversation continuity.
 * Same Project ID = Same thread_id = Shared conversation context
 *
 * @param projectId - Jira Project ID (e.g., "JCSC-1")
 * @returns Thread ID for LangGraph
 */
export function getThreadId(projectId: string): string {
  // Use Project ID directly as thread_id
  // This ensures all interactions with the same project share context
  return `project:${projectId}`;
}

/**
 * Check if a checkpoint exists for the given Project ID
 *
 * This function queries the checkpoints table to see if there's any existing
 * conversation history for the specified Project ID.
 *
 * @param projectId - Jira Project ID (e.g., "JCSC-1")
 * @returns Promise<boolean> - true if checkpoint exists, false otherwise
 */
export async function hasCheckpoint(projectId: string): Promise<boolean> {
  if (!checkpointerInstance) {
    console.warn('⚠️ Checkpointer not initialized, cannot check for existing checkpoints');
    return false;
  }

  try {
    const threadId = getThreadId(projectId);

    // Try to get the latest checkpoint for this thread
    const checkpoint = await checkpointerInstance.getTuple({
      configurable: { thread_id: threadId }
    });

    const exists = checkpoint !== undefined && checkpoint !== null;

    if (exists) {
      console.log(`📚 Found existing checkpoint for Project ID: ${projectId}`);
    } else {
      console.log(`📭 No existing checkpoint for Project ID: ${projectId}`);
    }

    return exists;
  } catch (error) {
    console.error(`❌ Error checking checkpoint for ${projectId}:`, error);
    return false;
  }
}
