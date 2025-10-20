/**
 * Database Maintenance Utilities
 *
 * Tools for cleaning up old data, running compression, and maintaining database health
 */

import { dbClient } from '../database/client';
import { contextManager } from '../services/context-manager';
import { contextCompressor } from '../services/context-compressor';
import { getContextCompressionConfig } from '../database/config';

export interface MaintenanceStats {
  deletedTurns: number;
  compressedProjects: number;
  errors: string[];
  duration: number;
}

export class DatabaseMaintenanceService {
  private compressionConfig = getContextCompressionConfig();

  /**
   * Run full maintenance routine
   */
  async runMaintenance(options?: {
    deleteOldTurns?: boolean;
    compressContexts?: boolean;
    daysToKeep?: number;
  }): Promise<MaintenanceStats> {
    const startTime = Date.now();
    const stats: MaintenanceStats = {
      deletedTurns: 0,
      compressedProjects: 0,
      errors: [],
      duration: 0,
    };

    console.log('🧹 Starting database maintenance...');

    try {
      // Delete old conversation turns
      if (options?.deleteOldTurns !== false) {
        try {
          const daysToKeep = options?.daysToKeep || 90;
          stats.deletedTurns = await contextManager.deleteOldTurns(daysToKeep);
          console.log(`✅ Deleted ${stats.deletedTurns} old conversation turns`);
        } catch (error: any) {
          stats.errors.push(`Failed to delete old turns: ${error?.message}`);
        }
      }

      // Compress contexts that need it
      if (options?.compressContexts !== false) {
        try {
          const projectsToCompress = await contextManager.getProjectsNeedingCompression(
            this.compressionConfig.turnThreshold,
            this.compressionConfig.tokenThreshold
          );

          for (const projectId of projectsToCompress) {
            try {
              await this.compressProject(projectId);
              stats.compressedProjects++;
            } catch (error: any) {
              stats.errors.push(`Failed to compress ${projectId}: ${error?.message}`);
            }
          }

          console.log(`✅ Compressed ${stats.compressedProjects} projects`);
        } catch (error: any) {
          stats.errors.push(`Failed to compress contexts: ${error?.message}`);
        }
      }

      stats.duration = Date.now() - startTime;
      console.log(`✅ Maintenance completed in ${stats.duration}ms`);

      return stats;
    } catch (error: any) {
      stats.errors.push(`Maintenance failed: ${error?.message}`);
      stats.duration = Date.now() - startTime;
      return stats;
    }
  }

  /**
   * Compress a specific project
   */
  async compressProject(projectId: string): Promise<void> {
    console.log(`🗜️ Compressing project ${projectId}...`);

    const projectContext = await contextManager.getProjectContext(projectId);
    if (!projectContext || !projectContext.rawHistory) {
      console.log(`⏭️ No context to compress for ${projectId}`);
      return;
    }

    const compressionResult = await contextCompressor.compressHistory(
      projectContext.rawHistory,
      this.compressionConfig.keepRecentTurns
    );

    const mergedContext = await contextCompressor.mergeCompressedContexts(
      projectContext.compressedContext,
      compressionResult.compressedContext
    );

    await contextManager.updateCompressedContext(projectId, mergedContext);

    console.log(
      `✅ Compressed ${projectId}: ${compressionResult.compressionRatio}% reduction`
    );
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    totalProjects: number;
    totalTurns: number;
    projectsWithCompression: number;
    avgTurnsPerProject: number;
    dbHealth: any;
  }> {
    try {
      const db = await dbClient.getDb();

      // Execute raw SQL for statistics
      const pool = dbClient.getPool();
      const client = await pool.connect();

      try {
        const projectCountResult = await client.query(
          'SELECT COUNT(*) as count FROM project_contexts'
        );
        const turnCountResult = await client.query(
          'SELECT COUNT(*) as count FROM conversation_turns'
        );
        const compressedCountResult = await client.query(
          'SELECT COUNT(*) as count FROM project_contexts WHERE compressed_context IS NOT NULL'
        );

        const totalProjects = parseInt(projectCountResult.rows[0]?.count || '0');
        const totalTurns = parseInt(turnCountResult.rows[0]?.count || '0');
        const projectsWithCompression = parseInt(compressedCountResult.rows[0]?.count || '0');

        const dbHealth = await dbClient.healthCheck();

        return {
          totalProjects,
          totalTurns,
          projectsWithCompression,
          avgTurnsPerProject: totalProjects > 0 ? totalTurns / totalProjects : 0,
          dbHealth,
        };
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Failed to get database stats:', error?.message);
      throw error;
    }
  }

  /**
   * Initialize database tables (create if not exist)
   */
  async initializeTables(): Promise<void> {
    console.log('📦 Initializing database tables...');

    const createProjectContextsTable = `
      CREATE TABLE IF NOT EXISTS project_contexts (
        project_id VARCHAR(50) PRIMARY KEY NOT NULL,
        compressed_context JSONB,
        raw_history JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_interactions INTEGER NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      );

      CREATE INDEX IF NOT EXISTS idx_project_contexts_last_updated
        ON project_contexts(last_updated);
    `;

    const createConversationTurnsTable = `
      CREATE TABLE IF NOT EXISTS conversation_turns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR(50) NOT NULL,
        workflow_id VARCHAR(100) NOT NULL,
        user_question TEXT NOT NULL,
        issue_type VARCHAR(50),
        reporter VARCHAR(100),
        classification VARCHAR(20),
        classification_confidence INTEGER,
        agent_response TEXT NOT NULL,
        response_agent VARCHAR(50),
        quality_score INTEGER,
        quality_feedback TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        processing_time_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb,
        FOREIGN KEY (project_id) REFERENCES project_contexts(project_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_conversation_turns_project_id
        ON conversation_turns(project_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_turns_created_at
        ON conversation_turns(created_at);
      CREATE INDEX IF NOT EXISTS idx_conversation_turns_workflow_id
        ON conversation_turns(workflow_id);
    `;

    const createCompressionHistoryTable = `
      CREATE TABLE IF NOT EXISTS compression_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR(50) NOT NULL,
        original_turns INTEGER NOT NULL,
        original_tokens INTEGER NOT NULL,
        compressed_tokens INTEGER NOT NULL,
        compression_ratio INTEGER NOT NULL,
        strategy VARCHAR(50) NOT NULL,
        model VARCHAR(50) NOT NULL,
        compressed_content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (project_id) REFERENCES project_contexts(project_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_compression_history_project_id
        ON compression_history(project_id);
      CREATE INDEX IF NOT EXISTS idx_compression_history_created_at
        ON compression_history(created_at);
    `;

    try {
      await dbClient.executeRaw(createProjectContextsTable);
      console.log('✅ Created project_contexts table');

      await dbClient.executeRaw(createConversationTurnsTable);
      console.log('✅ Created conversation_turns table');

      await dbClient.executeRaw(createCompressionHistoryTable);
      console.log('✅ Created compression_history table');

      console.log('✅ All tables initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize tables:', error?.message);
      throw error;
    }
  }

  /**
   * Vacuum and analyze database for performance
   */
  async optimize(): Promise<void> {
    console.log('🚀 Optimizing database...');

    try {
      const pool = dbClient.getPool();
      const client = await pool.connect();

      try {
        await client.query('VACUUM ANALYZE project_contexts');
        await client.query('VACUUM ANALYZE conversation_turns');
        await client.query('VACUUM ANALYZE compression_history');

        console.log('✅ Database optimization complete');
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('❌ Failed to optimize database:', error?.message);
      throw error;
    }
  }
}

// Export singleton instance
export const maintenanceService = new DatabaseMaintenanceService();

// CLI tool for running maintenance
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔧 Running database maintenance CLI...');

  (async () => {
    try {
      await dbClient.initialize();

      const command = process.argv[2];

      switch (command) {
        case 'init':
          await maintenanceService.initializeTables();
          break;

        case 'stats':
          const stats = await maintenanceService.getStats();
          console.log('\n📊 Database Statistics:');
          console.log(JSON.stringify(stats, null, 2));
          break;

        case 'compress':
          const projectId = process.argv[3];
          if (!projectId) {
            console.error('❌ Please provide a project ID');
            process.exit(1);
          }
          await maintenanceService.compressProject(projectId);
          break;

        case 'maintain':
          const maintenanceStats = await maintenanceService.runMaintenance();
          console.log('\n📊 Maintenance Results:');
          console.log(JSON.stringify(maintenanceStats, null, 2));
          break;

        case 'optimize':
          await maintenanceService.optimize();
          break;

        default:
          console.log(`
Usage:
  node database-maintenance.js <command> [options]

Commands:
  init          Initialize database tables
  stats         Show database statistics
  compress <id> Compress a specific project
  maintain      Run full maintenance routine
  optimize      Vacuum and analyze database
          `);
      }

      await dbClient.close();
      process.exit(0);
    } catch (error: any) {
      console.error('❌ Maintenance failed:', error);
      process.exit(1);
    }
  })();
}
