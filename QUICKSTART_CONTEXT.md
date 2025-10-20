# 快速開始指南 - 上下文存儲系統

## 1. 安裝依賴

由於 package.json 已更新,請安裝新增的依賴:

```bash
npm install
# 或使用 pnpm
pnpm install
```

新增的依賴:
- `pg` - PostgreSQL 客戶端
- `drizzle-orm` - TypeScript ORM
- `drizzle-kit` - 資料庫管理工具
- `@types/pg` - TypeScript 類型定義

## 2. 配置環境變數

在 `.env` 文件中添加以下配置:

```bash
# PostgreSQL 配置 (選擇一種方式)
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/jira_cs

# 上下文壓縮配置 (可選,使用默認值)
CONTEXT_COMPRESSION_TURN_THRESHOLD=5
CONTEXT_COMPRESSION_TOKEN_THRESHOLD=10000
CONTEXT_KEEP_RECENT_TURNS=3
CONTEXT_COMPRESSION_MODEL=gpt-4o-mini
CONTEXT_MAX_COMPRESSED_TOKENS=3000
```

## 3. 設置 PostgreSQL 資料庫

### 方法 1: 使用 Docker (推薦)

```bash
docker run --name jira-cs-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=jira_cs \
  -p 5432:5432 \
  -d postgres:16
```

### 方法 2: 本地安裝

1. 下載並安裝 PostgreSQL 16+
2. 創建資料庫:

```sql
CREATE DATABASE jira_cs;
```

## 4. 初始化資料庫表

運行初始化腳本創建所需的表:

```bash
npm run db:init
```

這會創建三個表:
- `project_contexts` - 專案上下文
- `conversation_turns` - 對話記錄
- `compression_history` - 壓縮歷史

## 5. 驗證設置

### 檢查資料庫連接

```bash
npm run db:stats
```

應該看到類似輸出:

```json
{
  "totalProjects": 0,
  "totalTurns": 0,
  "projectsWithCompression": 0,
  "avgTurnsPerProject": 0,
  "dbHealth": {
    "healthy": true,
    "timestamp": "2025-10-20T01:30:00.000Z"
  }
}
```

### 測試系統

運行測試以驗證上下文系統:

```bash
npm run test:mock
```

## 6. 使用示例

### 測試同一 Project ID 的多次互動

創建測試腳本 `test-context.ts`:

```typescript
import { JiraWorkflowOrchestrator } from './src/workflow/orchestrator';
import { mockJiraIssues } from './src/tests/mock-data';

const orchestrator = new JiraWorkflowOrchestrator();

async function testContextPersistence() {
  // 第一次互動
  console.log('=== 第一次互動 ===');
  const result1 = await orchestrator.processRequest(mockJiraIssues[0], {
    sendToJira: false,
  });
  console.log('Workflow ID:', result1.workflow_id);

  // 第二次互動 (相同 Project ID)
  console.log('\n=== 第二次互動 (應該有歷史上下文) ===');
  const result2 = await orchestrator.processRequest(
    {
      ...mockJiraIssues[0],
      forms: {
        ...mockJiraIssues[0].forms,
        Comment: {
          Created: new Date().toISOString(),
          Updated: new Date().toISOString(),
          Content: '我剛才問的問題解決了嗎?',
        },
      },
    },
    { sendToJira: false }
  );

  console.log('\n歷史上下文已加載:', result2.result?.historical_context?.hasHistory);
  console.log('上下文摘要:', result2.result?.historical_context?.contextSummary);
}

testContextPersistence();
```

運行:
```bash
npx ts-node test-context.ts
```

## 7. 監控與維護

### 查看統計信息

```bash
# 查看整體統計
npm run db:stats

# 查看特定專案統計 (需要編寫簡單腳本)
```

### 運行定期維護

```bash
# 手動運行維護 (清理舊數據 + 壓縮上下文)
npm run db:maintain
```

### 設置自動維護 (可選)

使用 cron job 或 Windows Task Scheduler:

```bash
# Linux/Mac - 每天凌晨 2 點
0 2 * * * cd /path/to/project && npm run db:maintain
```

## 8. 常見操作

### 壓縮特定專案

```bash
node src/utils/database-maintenance.ts compress JCSC-1
```

### 優化資料庫性能

```bash
node src/utils/database-maintenance.ts optimize
```

### 查看 Drizzle Studio (可視化工具)

```bash
npm run db:studio
```

## 9. 整合到現有工作流

系統已經自動整合,無需額外配置。每次調用 `orchestrator.processRequest()` 時:

1. ✅ 自動加載該 Project ID 的歷史上下文
2. ✅ 注入到 Agent Prompt 中
3. ✅ 處理完成後自動保存互動
4. ✅ 自動檢查並觸發壓縮

## 10. 調試與故障排查

### 啟用詳細日誌

在 `.env` 中設置:

```bash
LOG_LEVEL=debug
```

### 查看資料庫查詢

```typescript
// 在 database/client.ts 中啟用查詢日誌
const db = drizzle(this.pool, {
  schema,
  logger: true  // 啟用查詢日誌
});
```

### 常見問題

**Q: 資料庫連接失敗**
```
⚠️ Database initialization failed, context features disabled
```
A: 檢查 PostgreSQL 是否運行,DATABASE_URL 是否正確

**Q: 沒有加載歷史上下文**
```
📭 No existing context for project JCSC-1
```
A: 這是正常的,表示首次互動。再次運行即可看到上下文。

**Q: 壓縮不觸發**
```
上下文未被壓縮
```
A: 檢查是否達到閾值 (默認 5 輪對話或 10000 tokens)

## 11. 效能基準

在標準硬件上的性能參考:

- 加載上下文: ~50ms
- 保存互動: ~30ms
- 壓縮 10 輪對話: ~2-3s (取決於 LLM API)
- 資料庫查詢: ~10ms (有索引)

## 12. 下一步

1. 閱讀完整文檔: [CONTEXT_STORAGE.md](./CONTEXT_STORAGE.md)
2. 瀏覽源碼:
   - [src/services/context-manager.ts](src/services/context-manager.ts) - CRUD 操作
   - [src/services/context-compressor.ts](src/services/context-compressor.ts) - 壓縮邏輯
   - [src/services/context-retriever.ts](src/services/context-retriever.ts) - 檢索邏輯
3. 定制壓縮策略以適應你的需求
4. 設置監控和告警

## 問題反饋

如有問題,請查看:
- 日誌輸出
- [CONTEXT_STORAGE.md](./CONTEXT_STORAGE.md) 中的故障排查部分
- 提交 Issue

祝使用愉快! 🚀
