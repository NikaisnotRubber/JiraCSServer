/**
 * Database Configuration
 *
 * PostgreSQL connection configuration for context storage
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    // Parse DATABASE_URL (postgresql://user:pass@host:port/db)
    const url = new URL(dbUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1), // Remove leading /
      user: url.username,
      password: url.password,
      ssl: process.env.DATABASE_SSL === 'true',
      maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
      idleTimeoutMs: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMs: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000'),
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    database: process.env.DATABASE_NAME || 'jira_cs',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    ssl: process.env.DATABASE_SSL === 'true',
    maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '10'),
    idleTimeoutMs: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMs: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000'),
  };
}

/**
 * Context compression configuration
 */
export interface ContextCompressionConfig {
  /** Trigger compression when conversation turns exceed this threshold */
  turnThreshold: number;

  /** Trigger compression when total tokens exceed this threshold */
  tokenThreshold: number;

  /** Keep this many recent turns uncompressed */
  keepRecentTurns: number;

  /** LLM model to use for compression */
  compressionModel: string;

  /** Maximum tokens for compressed context */
  maxCompressedTokens: number;
}

/**
 * Get context compression configuration
 */
export function getContextCompressionConfig(): ContextCompressionConfig {
  return {
    turnThreshold: parseInt(process.env.CONTEXT_COMPRESSION_TURN_THRESHOLD || '5'),
    tokenThreshold: parseInt(process.env.CONTEXT_COMPRESSION_TOKEN_THRESHOLD || '10000'),
    keepRecentTurns: parseInt(process.env.CONTEXT_KEEP_RECENT_TURNS || '3'),
    compressionModel: process.env.CONTEXT_COMPRESSION_MODEL || 'gpt-4o-mini',
    maxCompressedTokens: parseInt(process.env.CONTEXT_MAX_COMPRESSED_TOKENS || '3000'),
  };
}

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: DatabaseConfig): void {
  const errors: string[] = [];

  if (!config.host) errors.push('Database host is required');
  if (!config.database) errors.push('Database name is required');
  if (!config.user) errors.push('Database user is required');
  if (!config.password) errors.push('Database password is required');
  if (config.port < 1 || config.port > 65535) errors.push('Invalid database port');

  if (errors.length > 0) {
    throw new Error(`Database configuration errors:\n${errors.join('\n')}`);
  }
}
