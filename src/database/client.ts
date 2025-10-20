/**
 * Database Client
 *
 * PostgreSQL connection pool and Drizzle ORM client wrapper
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { getDatabaseConfig, validateDatabaseConfig } from './config';

const { Pool } = pg;

/**
 * Database client singleton
 */
class DatabaseClient {
  private pool: pg.Pool | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private isInitialized = false;

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📦 Database already initialized');
      return;
    }

    try {
      const config = getDatabaseConfig();
      validateDatabaseConfig(config);

      console.log(`📦 Initializing database connection to ${config.host}:${config.port}/${config.database}`);

      this.pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        max: config.maxConnections,
        idleTimeoutMillis: config.idleTimeoutMs,
        connectionTimeoutMillis: config.connectionTimeoutMs,
      });

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      console.log(`✅ Database connection successful at ${result.rows[0].now}`);

      // Initialize Drizzle ORM
      this.db = drizzle(this.pool, { schema });

      this.isInitialized = true;
    } catch (error: any) {
      console.error('❌ Failed to initialize database:', error?.message || error);
      throw new Error(`Database initialization failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get Drizzle ORM instance
   */
  getDb(): ReturnType<typeof drizzle> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get raw pg Pool for advanced queries
   */
  getPool(): pg.Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  /**
   * Check if database is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.pool !== null && this.db !== null;
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      console.log('📦 Closing database connection pool...');
      await this.pool.end();
      this.pool = null;
      this.db = null;
      this.isInitialized = false;
      console.log('✅ Database connection pool closed');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    timestamp: string;
    poolStats?: {
      total: number;
      idle: number;
      waiting: number;
    };
    error?: string;
  }> {
    try {
      if (!this.pool) {
        return {
          healthy: false,
          timestamp: new Date().toISOString(),
          error: 'Database pool not initialized',
        };
      }

      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      return {
        healthy: true,
        timestamp: result.rows[0].now,
        poolStats: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount,
        },
      };
    } catch (error: any) {
      return {
        healthy: false,
        timestamp: new Date().toISOString(),
        error: error?.message || 'Unknown health check error',
      };
    }
  }

  /**
   * Execute raw SQL query (for migrations, etc.)
   */
  async executeRaw(sql: string): Promise<any> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(sql);
      return result;
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const dbClient = new DatabaseClient();

// Export schema for direct access
export { schema };

/**
 * Initialize database on module import (lazy initialization)
 */
export async function initializeDatabase(): Promise<void> {
  if (!dbClient.isReady()) {
    await dbClient.initialize();
  }
}

/**
 * Get database instance (auto-initialize if needed)
 */
export async function getDatabase(): Promise<ReturnType<typeof drizzle>> {
  if (!dbClient.isReady()) {
    await dbClient.initialize();
  }
  return dbClient.getDb();
}
