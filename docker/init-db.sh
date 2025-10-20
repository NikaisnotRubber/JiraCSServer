#!/bin/bash
set -e

###############################################################################
# PostgreSQL Database Initialization Script for Jira CS Server
#
# This script runs automatically when the PostgreSQL container starts
# for the first time. It creates the necessary tables for the context
# storage system.
###############################################################################

echo "🔧 Starting database initialization for Jira CS Server..."

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "✅ PostgreSQL is ready. Creating tables..."

# Create tables using psql
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- Create project_contexts table
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

    -- Create index on last_updated
    CREATE INDEX IF NOT EXISTS idx_project_contexts_last_updated
        ON project_contexts(last_updated);

    -- Create conversation_turns table
    CREATE TABLE IF NOT EXISTS conversation_turns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    -- Create indexes on conversation_turns
    CREATE INDEX IF NOT EXISTS idx_conversation_turns_project_id
        ON conversation_turns(project_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_turns_created_at
        ON conversation_turns(created_at);
    CREATE INDEX IF NOT EXISTS idx_conversation_turns_workflow_id
        ON conversation_turns(workflow_id);

    -- Create compression_history table
    CREATE TABLE IF NOT EXISTS compression_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

    -- Create indexes on compression_history
    CREATE INDEX IF NOT EXISTS idx_compression_history_project_id
        ON compression_history(project_id);
    CREATE INDEX IF NOT EXISTS idx_compression_history_created_at
        ON compression_history(created_at);

    -- Grant permissions (if needed)
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $POSTGRES_USER;

    -- Display table information
    SELECT 'project_contexts' as table_name, COUNT(*) as row_count FROM project_contexts
    UNION ALL
    SELECT 'conversation_turns', COUNT(*) FROM conversation_turns
    UNION ALL
    SELECT 'compression_history', COUNT(*) FROM compression_history;

EOSQL

echo "✅ Database initialization complete!"
echo "📊 Tables created:"
echo "   - project_contexts"
echo "   - conversation_turns"
echo "   - compression_history"
echo ""
echo "🎉 Database is ready for use!"
