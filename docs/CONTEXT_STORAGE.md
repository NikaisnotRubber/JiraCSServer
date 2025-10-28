# Context Storage & Compression System

## 概述

本系統實現了基於 PostgreSQL 的對話上下文管理,使用 Project ID 作為索引,確保同一工單的後續追問能夠引用正確且完整的歷史上下文。

## 核心功能

### 1. 上下文存儲
- **Project Contexts**: 存儲每個 Project ID 的壓縮上下文和完整歷史
- **Conversation Turns**: 詳細記錄每次對話的問題、回答、分類和質量評分
- **Compression History**: 追蹤壓縮操作,用於調試和分析

### 2. 智能壓縮
- 使用 LLM (GPT-4o-mini) 進行智能摘要
- 保留關鍵技術細節、未解決問題和重要決策
- 自動觸發壓縮當對話輪數 > 5 或總 tokens > 10000
- 保留最近 3 輪完整對話

### 3. 上下文注入
- 自動加載 Project ID 的歷史上下文
- 優先注入到 Prompt 開頭
- 格式化為易讀的 Markdown 格式

## 資料庫架構

### Tables

#### `project_contexts`
存儲專案級別的上下文信息

```sql
- project_id (PK): 專案標識符 (如 "JCSC-1")
- compressed_context (JSONB): 壓縮後的上下文
- raw_history (JSONB[]): 完整對話歷史
- total_interactions: 總互動次數
- total_tokens: 總 token 數
- last_updated: 最後更新時間
- created_at: 創建時間
- metadata (JSONB): 額外元數據
```

#### `conversation_turns`
詳細的對話記錄

```sql
- id (UUID PK)
- project_id (FK): 關聯到 project_contexts
- workflow_id: 工作流執行 ID
- user_question: 用戶問題
- classification: 問題分類
- agent_response: Agent 回應
- quality_score: 質量評分 (0-100)
- total_tokens: Token 使用量
- created_at: 時間戳
```

#### `compression_history`
壓縮操作歷史

```sql
- id (UUID PK)
- project_id (FK)
- original_turns: 原始對話輪數
- original_tokens: 原始 token 數
- compressed_tokens: 壓縮後 token 數
- compression_ratio: 壓縮比例 (%)
- created_at: 壓縮時間
```

## 使用方法

### 1. 環境配置

複製 `.env.example` 到 `.env` 並配置:

```bash
# PostgreSQL 連接 (兩種方式選一種)
DATABASE_URL=postgresql://user:password@localhost:5432/jira_cs

# 或使用個別變數
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=jira_cs
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# 壓縮配置
CONTEXT_COMPRESSION_TURN_THRESHOLD=5
CONTEXT_COMPRESSION_TOKEN_THRESHOLD=10000
CONTEXT_KEEP_RECENT_TURNS=3
CONTEXT_COMPRESSION_MODEL=gpt-4o-mini
```

### 2. 初始化資料庫

```bash
# 安裝依賴
npm install

# 初始化資料庫表
npm run db:init

# 或使用維護工具
node src/utils/database-maintenance.ts init
```

### 3. 資料庫維護

```bash
# 查看統計信息
node src/utils/database-maintenance.ts stats

# 運行完整維護 (清理 + 壓縮)
node src/utils/database-maintenance.ts maintain

# 壓縮特定專案
node src/utils/database-maintenance.ts compress JCSC-1

# 優化資料庫性能
node src/utils/database-maintenance.ts optimize
```

## 工作流程

### 請求處理流程

```
1. 接收工單請求 (Project ID: JCSC-1)
   ↓
2. 加載歷史上下文
   - 查詢 project_contexts 表
   - 獲取壓縮摘要 + 最近 3 輪對話
   ↓
3. 注入上下文到 Workflow State
   - state.historical_context.formattedContext
   ↓
4. Agent 處理 (含歷史上下文)
   - ContextAssembler 將歷史上下文注入 Prompt
   ↓
5. 保存互動記錄
   - 插入 conversation_turns
   - 更新 project_contexts.raw_history
   ↓
6. 檢查是否需要壓縮
   - 如果 turns > 5 或 tokens > 10000
   - 觸發 LLM 壓縮
```

### 壓縮流程

```
1. 檢測到需要壓縮 (turns > 5)
   ↓
2. 分離歷史
   - 待壓縮: 前 N-3 輪
   - 保留完整: 最近 3 輪
   ↓
3. LLM 壓縮
   - 使用 GPT-4o-mini
   - 提取 summary, keyDetails, unresolvedIssues, decisions
   ↓
4. 合併上下文
   - 與舊的壓縮內容合併
   ↓
5. 更新資料庫
   - 保存到 project_contexts.compressed_context
```

## API 使用示例

### 程式化使用

```typescript
import { contextRetriever } from './services/context-retriever';
import { contextManager } from './services/context-manager';

// 獲取專案上下文
const context = await contextRetriever.retrieveContext('JCSC-1');
console.log(context.formattedContext);

// 保存互動
await contextManager.saveInteraction({
  projectId: 'JCSC-1',
  workflowId: 'workflow-123',
  userQuestion: '如何重設密碼?',
  classification: 'JIRA_SIMPLE',
  agentResponse: '您可以通過以下步驟重設密碼...',
  qualityScore: 85,
  totalTokens: 150,
});

// 觸發壓縮
await contextRetriever.triggerCompressionIfNeeded('JCSC-1');
```

## 性能優化

### 索引
- `project_id` 上的主鍵索引
- `last_updated` 時間索引
- `created_at` 時間索引
- `workflow_id` 索引

### 連接池配置
```
MAX_CONNECTIONS=10        # 最大連接數
IDLE_TIMEOUT=30000        # 閒置超時 (ms)
CONNECTION_TIMEOUT=5000   # 連接超時 (ms)
```

### 定期維護
建議設置 cron job 每天運行:

```bash
# 每天凌晨 2 點運行維護
0 2 * * * node /path/to/database-maintenance.ts maintain
```

## 監控與統計

### 獲取統計信息

```typescript
import { maintenanceService } from './utils/database-maintenance';

const stats = await maintenanceService.getStats();
console.log(stats);
// {
//   totalProjects: 150,
//   totalTurns: 2500,
//   projectsWithCompression: 45,
//   avgTurnsPerProject: 16.7,
//   dbHealth: { healthy: true, ... }
// }
```

### 專案統計

```typescript
const projectStats = await contextManager.getProjectStats('JCSC-1');
// {
//   totalInteractions: 8,
//   totalTokens: 12500,
//   averageQualityScore: 87.5,
//   lastInteraction: "2025-10-20T01:30:00.000Z",
//   hasCompressedContext: true
// }
```

## 故障排查

### 資料庫連接失敗
```
⚠️ Database initialization failed, context features disabled
```
**解決方案:**
1. 檢查 PostgreSQL 是否運行
2. 驗證 DATABASE_URL 正確性
3. 確認防火牆/網絡設置

### 壓縮失敗
```
❌ Compression failed: No response from LLM
```
**解決方案:**
1. 檢查 OPENAI_API_KEY 是否有效
2. 驗證網絡連接
3. 查看 API 配額限制

### 上下文未加載
```
📭 No existing context for project JCSC-1
```
**這是正常的** - 表示這是該專案的第一次互動

## 架構圖

```
┌─────────────────────────────────────────────────┐
│           Jira CS Server Workflow               │
│                                                  │
│  ┌──────────────┐      ┌──────────────┐        │
│  │ Orchestrator │─────▶│  Database    │        │
│  │              │      │  Client      │        │
│  └──────────────┘      └──────────────┘        │
│         │                      │                │
│         │                      ▼                │
│         │              ┌──────────────┐        │
│         │              │ PostgreSQL   │        │
│         │              │  - Contexts  │        │
│         │              │  - Turns     │        │
│         │              └──────────────┘        │
│         │                                       │
│         ▼                                       │
│  ┌──────────────┐      ┌──────────────┐       │
│  │   Context    │◀─────│   Context    │       │
│  │  Retriever   │      │  Manager     │       │
│  └──────────────┘      └──────────────┘       │
│         │                      ▲                │
│         │                      │                │
│         ▼                      │                │
│  ┌──────────────┐      ┌──────────────┐       │
│  │   Context    │      │   Context    │       │
│  │  Assembler   │      │ Compressor   │       │
│  └──────────────┘      └──────────────┘       │
│         │                      │                │
│         ▼                      ▼                │
│  ┌──────────────┐      ┌──────────────┐       │
│  │    Agent     │      │     LLM      │       │
│  │   (V1/V2)    │      │  (GPT-4o)    │       │
│  └──────────────┘      └──────────────┘       │
└─────────────────────────────────────────────────┘
```

## 未來增強

- [ ] 支持多租戶隔離
- [ ] 實現上下文版本管理
- [ ] 添加上下文相似度搜索 (向量化)
- [ ] 實現智能上下文剪枝策略
- [ ] 添加 Grafana 監控面板
- [ ] 支持分布式部署

## 貢獻

如有問題或建議,請提交 Issue 或 Pull Request。

## License

ISC
