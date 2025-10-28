# LangMem Integration Guide

## Overview

This project uses **LangGraph's native LangMem** (checkpoint-based memory management) to maintain conversation context across multiple interactions. LangMem automatically persists workflow state using PostgreSQL, enabling seamless conversation continuity for the same Project ID.

## What is LangMem?

LangMem is LangGraph's built-in memory system that:
- **Automatically saves workflow state** after each node execution
- **Uses PostgreSQL checkpoints** to persist conversation history
- **Maintains thread continuity** using `thread_id` as the conversation identifier
- **Requires no manual state management** - everything is handled automatically

## How It Works

### Architecture

```
User Request (Project ID: JCSC-1)
    ↓
Generate thread_id: "project:JCSC-1"
    ↓
Initialize Workflow with PostgresSaver
    ↓
Invoke workflow with configurable.thread_id
    ↓
[LangGraph automatically saves state after each node]
    ↓
Workflow completes
    ↓
Next request with same Project ID uses same thread_id
    ↓
LangGraph automatically loads previous state
    ↓
Context continuity maintained!
```

### Key Concepts

1. **thread_id**: Identifier for conversation thread (derived from Project ID)
   - Same Project ID → Same thread_id → Shared context
   - Different Project ID → Different thread_id → Separate context

2. **PostgresSaver**: LangGraph's checkpoint backend
   - Stores workflow state in PostgreSQL
   - Creates tables: `checkpoints`, `checkpoint_writes`, `checkpoint_blobs`
   - Automatic setup on first initialization

3. **Configurable**: Runtime configuration passed to workflow
   - `thread_id` enables conversation continuity
   - No other configuration needed

## Implementation Details

### 1. Checkpoint Saver Configuration

**File**: `src/workflow/checkpoint.ts`

```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

export async function createCheckpointer(): Promise<PostgresSaver> {
  const connectionString = process.env.DATABASE_URL;
  const checkpointer = PostgresSaver.fromConnString(connectionString);
  await checkpointer.setup(); // Creates checkpoint tables
  return checkpointer;
}

export function getThreadId(projectId: string): string {
  return `project:${projectId}`;
}
```

### 2. Workflow Graph Integration

**File**: `src/workflow/graph.ts`

```typescript
import { createCheckpointer } from './checkpoint.js';

export async function initializeWorkflow() {
  const checkpointer = await createCheckpointer();
  const compiledApp = workflow.compile({ checkpointer });
  return compiledApp;
}
```

### 3. Orchestrator Usage

**File**: `src/workflow/orchestrator.ts`

```typescript
import { initializeWorkflow } from './graph';
import { getThreadId } from './checkpoint';

export class JiraWorkflowOrchestrator {
  async processRequest(request: JiraIssueInput, options?) {
    const app = await this.ensureWorkflow();
    const projectId = request.forms["Project ID"];
    const threadId = getThreadId(projectId);

    const result = await app.invoke(initialState, {
      recursionLimit: 50,
      configurable: {
        thread_id: threadId, // Enables conversation continuity
      },
    });

    return result;
  }
}
```

## Database Setup

### Prerequisites

- PostgreSQL 14+ running and accessible
- `DATABASE_URL` environment variable configured

### Automatic Table Creation

LangMem automatically creates the following tables on first initialization:

```sql
-- Created by PostgresSaver.setup()
CREATE TABLE checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT,
  checkpoint JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE checkpoint_writes (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  channel TEXT NOT NULL,
  type TEXT,
  blob BYTEA,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE TABLE checkpoint_blobs (
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  channel TEXT NOT NULL,
  version TEXT NOT NULL,
  type TEXT NOT NULL,
  blob BYTEA,
  PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);
```

### Environment Configuration

**`.env`**:
```bash
# LangMem uses this for checkpoint persistence
DATABASE_URL=postgresql://user:password@localhost:5432/jira_cs
```

## Usage Examples

### Basic Workflow Invocation

```typescript
const orchestrator = new JiraWorkflowOrchestrator();

// First interaction
const issue1 = {
  forms: {
    "Project ID": "JCSC-1",
    Comment: { Content: "我無法連接VPN" }
  }
};
await orchestrator.processRequest(issue1);

// Follow-up interaction (has context from first)
const issue2 = {
  forms: {
    "Project ID": "JCSC-1", // Same Project ID = Same context
    Comment: { Content: "剛才的問題解決了嗎?" }
  }
};
await orchestrator.processRequest(issue2);
// ✅ LangMem automatically loads previous interaction context
```

### Different Projects (Separate Contexts)

```typescript
// Project A
await orchestrator.processRequest({
  forms: { "Project ID": "JCSC-1", Comment: { Content: "VPN問題" } }
});

// Project B (different context)
await orchestrator.processRequest({
  forms: { "Project ID": "JCSC-2", Comment: { Content: "密碼重設" } }
});
// ✅ Different thread_id = Separate conversation context
```

## Testing

### Run LangMem Integration Test

```bash
# In WSL
cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer
npm run test:langmem
```

**Test Scenario**:
1. First interaction with Project JCSC-TEST-1
2. Follow-up with same Project (should have context)
3. New interaction with Project JCSC-TEST-2 (separate context)
4. Return to Project JCSC-TEST-1 (should maintain context)

**Expected Output**:
```
✅ Test 1 (Project A - First): PASS
✅ Test 2 (Project A - Follow-up): PASS - Context loaded
✅ Test 3 (Project B - New): PASS - No context (different project)
✅ Test 4 (Project A - Return): PASS - Context maintained
```

## Advantages of LangMem

### Compared to Custom Context Management

| Feature | LangMem | Custom PostgreSQL |
|---------|---------|-------------------|
| **State Persistence** | ✅ Automatic | ❌ Manual saveInteraction() |
| **Context Loading** | ✅ Automatic | ❌ Manual contextRetriever.buildContext() |
| **State Versioning** | ✅ Built-in (checkpoint_id) | ❌ Manual implementation |
| **Compression** | ✅ Automatic (configurable) | ❌ Manual LLM compression |
| **Thread Safety** | ✅ Built-in | ⚠️ Manual locking |
| **Error Recovery** | ✅ Checkpoint rollback | ❌ Manual error handling |

### Key Benefits

1. **Zero-Configuration Memory**: No need to manually save/load context
2. **Automatic State Management**: LangGraph handles all persistence
3. **Built-in Versioning**: Every checkpoint has a unique ID
4. **Time-Travel Debugging**: Can replay from any checkpoint
5. **Thread Isolation**: Different threads never interfere

## Custom Context Management (Hybrid Approach)

The system maintains **both** LangMem and custom PostgreSQL context:

- **LangMem**: Primary workflow state persistence (automatic)
- **Custom Context**: Analytics, compression, custom features (manual)

**Why Both?**
- LangMem handles workflow continuity automatically
- Custom context provides analytics, metrics, and specialized compression
- Hybrid approach gives best of both worlds

**Custom Context Tables** (kept for analytics):
- `project_contexts`: Compressed summaries and metadata
- `conversation_turns`: Detailed interaction logs
- `compression_history`: Compression audit trail

## Monitoring and Debugging

### Check Checkpoint Tables

```sql
-- View all threads
SELECT DISTINCT thread_id FROM checkpoints ORDER BY thread_id;

-- View checkpoints for specific project
SELECT
  checkpoint_id,
  parent_checkpoint_id,
  metadata,
  checkpoint->>'workflow_id' as workflow_id
FROM checkpoints
WHERE thread_id = 'project:JCSC-1'
ORDER BY checkpoint_id DESC;
```

### Enable Debug Logging

```typescript
// In checkpoint.ts
console.log('🔗 Initializing LangGraph checkpoint saver...');
console.log('✅ LangGraph checkpoint saver initialized');

// In orchestrator.ts
console.log(`🧵 Using thread_id: ${threadId} for Project ID: ${projectId}`);
```

## Common Issues and Solutions

### Issue 1: Database Connection Failed

**Symptom**:
```
❌ Failed to initialize checkpoint saver: connection refused
```

**Solution**:
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Issue 2: No Context Loaded

**Symptom**:
```
⚠️  No historical context (expected context from previous interaction)
```

**Solution**:
- Verify same Project ID is used for thread continuity
- Check checkpoint tables for thread_id existence:
  ```sql
  SELECT * FROM checkpoints WHERE thread_id = 'project:JCSC-1';
  ```
- Ensure `thread_id` is passed in `configurable` option

### Issue 3: Checkpoint Tables Not Created

**Symptom**:
```
ERROR: relation "checkpoints" does not exist
```

**Solution**:
- Ensure `checkpointer.setup()` is called during initialization
- Check database permissions for table creation
- Manually run setup if needed:
  ```typescript
  const checkpointer = PostgresSaver.fromConnString(DATABASE_URL);
  await checkpointer.setup();
  ```

## Advanced Usage

### Accessing Checkpoint History

```typescript
import { getCheckpointer } from './checkpoint';

const checkpointer = getCheckpointer();
const threadId = getThreadId('JCSC-1');

// Get latest checkpoint
const latestCheckpoint = await checkpointer.get({
  configurable: { thread_id: threadId }
});

// Get checkpoint history
const history = await checkpointer.list({
  configurable: { thread_id: threadId }
});
```

### Custom Checkpoint Metadata

```typescript
await app.invoke(initialState, {
  configurable: {
    thread_id: threadId,
  },
  metadata: {
    project_id: projectId,
    user_id: request.forms.Reporter,
    timestamp: new Date().toISOString(),
  },
});
```

## Migration from Custom Context

If migrating from the previous custom PostgreSQL approach:

1. ✅ **Keep custom tables** for analytics and reporting
2. ✅ **Use LangMem** for primary workflow state persistence
3. ✅ **Simplify orchestrator** - remove manual context loading/saving for workflow state
4. ⚠️ **Gradual migration** - hybrid approach works fine during transition

**No breaking changes** - both systems coexist peacefully!

## Performance Considerations

### Checkpoint Size

- Checkpoints store full workflow state (JSONB)
- Large states may impact performance
- Consider state pruning for long conversations

### Database Load

- One checkpoint per workflow invocation
- Indexes on `thread_id` ensure fast lookups
- Connection pooling recommended for high concurrency

### Cleanup Strategy

```sql
-- Clean up old checkpoints (example: older than 90 days)
DELETE FROM checkpoints
WHERE (checkpoint->>'started_at')::timestamp < NOW() - INTERVAL '90 days';
```

## References

- [LangGraph Checkpoint Documentation](https://langchain-ai.github.io/langgraph/concepts/persistence/)
- [PostgresSaver API Reference](https://langchain-ai.github.io/langgraph/reference/checkpoints/#postgresconfiguration)
- Project Files:
  - [src/workflow/checkpoint.ts](src/workflow/checkpoint.ts)
  - [src/workflow/graph.ts](src/workflow/graph.ts)
  - [src/workflow/orchestrator.ts](src/workflow/orchestrator.ts)
  - [src/tests/test-langmem.ts](src/tests/test-langmem.ts)

## Summary

LangMem provides a **zero-configuration**, **automatic** conversation continuity solution:

- ✅ No manual context saving/loading
- ✅ Thread-based conversation isolation
- ✅ Built-in state versioning and rollback
- ✅ PostgreSQL-backed for reliability
- ✅ Works seamlessly with existing workflow

**Just set `thread_id` and everything else is automatic!**

---

**Last Updated**: 2025-10-20
**Version**: 2.0.0 (LangMem Integration)
