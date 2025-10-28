# Troubleshooting Guide

本文檔統一整理 JiraCSServer 項目的常見問題與解決方案,涵蓋所有模組。

## 目錄

- [資料庫相關](#資料庫相關)
- [API 與服務器](#api-與服務器)
- [Context Storage 系統](#context-storage-系統)
- [LangMem Checkpoints](#langmem-checkpoints)
- [Agent 與工作流](#agent-與工作流)
- [Streamlit 客戶端](#streamlit-客戶端)
- [開發環境 (WSL)](#開發環境-wsl)
- [依賴與安裝](#依賴與安裝)
- [性能問題](#性能問題)

---

## 資料庫相關

### 問題 1: 資料庫連接失敗

**症狀**:
```
⚠️ Database initialization failed, context features disabled
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**原因**:
- PostgreSQL 服務未運行
- DATABASE_URL 配置錯誤
- 防火牆阻擋連接
- WSL 與 Windows 網絡隔離

**解決方案**:

1. 檢查 PostgreSQL 是否運行

```bash
# Docker
docker ps | grep postgres

# 如果未運行,啟動容器
docker start jira-cs-postgres

# 本地安裝
sudo systemctl status postgresql
sudo systemctl start postgresql
```

2. 驗證 DATABASE_URL 正確性

```bash
# 測試連接
psql $DATABASE_URL -c "SELECT 1"

# 預期輸出:
#  ?column?
# ----------
#         1
```

3. 檢查 .env 文件配置

```bash
# 確保格式正確
DATABASE_URL=postgresql://user:password@localhost:5432/jira_cs

# 注意:
# - 用戶名和密碼不應包含特殊字符 (或需要 URL 編碼)
# - 主機名應為 localhost 或 127.0.0.1
# - 端口預設為 5432
```

4. WSL 網絡問題 (如果 PostgreSQL 在 Windows 上)

```bash
# 使用 Windows 主機 IP,而非 localhost
# 查找 Windows IP
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'

# 更新 DATABASE_URL
DATABASE_URL=postgresql://user:password@<WINDOWS_IP>:5432/jira_cs
```

### 問題 2: 權限錯誤

**症狀**:
```
permission denied for table project_contexts
permission denied for schema public
```

**解決方案**:

```sql
-- 連接到資料庫
psql $DATABASE_URL

-- 授予完整權限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jira_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jira_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO jira_user;

-- 設置預設權限 (未來創建的表)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO jira_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO jira_user;

\q
```

### 問題 3: 表已存在錯誤

**症狀**:
```
relation "project_contexts" already exists
```

**解決方案**:

方案 A: 跳過已存在的表 (保留數據)

```bash
# 維護工具會自動跳過已存在的表
npm run db:init
```

方案 B: 重新初始化 (警告:會刪除所有數據!)

```bash
# 僅在開發環境使用!
psql $DATABASE_URL << 'EOF'
DROP TABLE IF EXISTS compression_history CASCADE;
DROP TABLE IF EXISTS conversation_turns CASCADE;
DROP TABLE IF EXISTS project_contexts CASCADE;
EOF

# 重新初始化
npm run db:init
```

### 問題 4: 連接池耗盡

**症狀**:
```
Error: Pooler error: Number of connections exceeds limit
```

**解決方案**:

調整連接池配置 (在 `.env` 中):

```bash
# 增加最大連接數
DATABASE_MAX_CONNECTIONS=20

# 減少閒置超時 (更快釋放連接)
DATABASE_IDLE_TIMEOUT=10000
```

---

## API 與服務器

### 問題 5: API 服務器啟動失敗

**症狀**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解決方案**:

端口 3000 被占用,選擇以下方案之一:

方案 A: 停止占用端口的進程

```bash
# 查找占用 3000 端口的進程
lsof -i :3000

# 殺死進程 (替換 <PID> 為實際 PID)
kill -9 <PID>
```

方案 B: 更改端口

```bash
# 在 .env 中設置
PORT=3001

# 或啟動時指定
PORT=3001 npm run server
```

### 問題 6: OpenAI API 調用失敗

**症狀**:
```
Error: Request failed with status code 401
Error: Incorrect API key provided
```

**解決方案**:

1. 檢查 API Key 是否正確

```bash
# 在 .env 中確認
OPENAI_API_KEY=sk-...

# 測試 API Key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

2. 檢查網絡連接

```bash
# 確保可以訪問 OpenAI API
ping api.openai.com

# 如果在公司網絡,可能需要代理
export HTTPS_PROXY=http://proxy.company.com:8080
```

3. 檢查 API 配額

登入 [OpenAI Platform](https://platform.openai.com/account/usage) 查看使用量和限額。

### 問題 7: 請求超時

**症狀**:
```
Error: Request timeout after 120000ms
```

**解決方案**:

增加超時時間 (在 `.env` 中):

```bash
# API 調用超時 (毫秒)
OPENAI_TIMEOUT=180000  # 3 分鐘

# LLM 請求超時
LLM_REQUEST_TIMEOUT=120000  # 2 分鐘
```

---

## Context Storage 系統

### 問題 8: 上下文未加載

**症狀**:
```
📭 No existing context for project JCSC-1
```

**原因**:
這通常不是錯誤,而是正常行為:
- 這是該 Project ID 的首次互動
- 系統會為新專案創建上下文記錄

**驗證**:

再次使用相同 Project ID 發送請求,應該會看到:

```
📚 Found existing context for Project ID: JCSC-1
✅ Retrieved context for JCSC-1: 1 total interactions, 0 recent turns
```

**如果仍未加載**:

檢查資料庫是否有記錄:

```sql
-- 連接到資料庫
psql $DATABASE_URL

-- 查詢專案上下文
SELECT project_id, total_interactions FROM project_contexts WHERE project_id = 'JCSC-1';

-- 查詢對話記錄
SELECT COUNT(*) FROM conversation_turns WHERE project_id = 'JCSC-1';
```

### 問題 9: 壓縮失敗

**症狀**:
```
❌ Compression failed: No response from LLM
❌ Context compression failed: Token limit exceeded
```

**解決方案**:

1. 檢查 OpenAI API 狀態 (問題 6)

2. 調整壓縮配置 (在 `.env` 中):

```bash
# 提高壓縮閾值 (減少壓縮頻率)
CONTEXT_COMPRESSION_TURN_THRESHOLD=10  # 從 5 增加到 10
CONTEXT_COMPRESSION_TOKEN_THRESHOLD=15000  # 從 10000 增加

# 減少保留的完整對話輪數
CONTEXT_KEEP_RECENT_TURNS=2  # 從 3 減少到 2

# 使用更小的壓縮模型
CONTEXT_COMPRESSION_MODEL=gpt-3.5-turbo  # 從 gpt-4o-mini 更換
```

3. 手動觸發壓縮 (調試用)

```bash
# 壓縮特定專案
node src/utils/database-maintenance.ts compress JCSC-1
```

### 問題 10: Token 使用量異常高

**症狀**:
上下文壓縮後 token 使用量仍然很高。

**解決方案**:

1. 查看壓縮歷史

```bash
npm run db:stats
```

2. 檢查壓縮比例

```sql
SELECT
  project_id,
  original_tokens,
  compressed_tokens,
  compression_ratio
FROM compression_history
ORDER BY created_at DESC
LIMIT 5;
```

3. 如果壓縮效果不佳 (compression_ratio < 50%):

```bash
# 增加壓縮強度
CONTEXT_MAX_COMPRESSED_TOKENS=2000  # 從 3000 減少
```

---

## LangMem Checkpoints

### 問題 11: Checkpoint 表未創建

**症狀**:
```
relation "checkpoints" does not exist
```

**原因**:
LangMem checkpoint 表由 LangGraph PostgresSaver 自動創建,但首次運行時可能未觸發。

**解決方案**:

運行一次工作流以觸發創建:

```bash
# 運行 LangMem 測試
npm run test:langmem
```

或手動初始化:

```typescript
// 在代碼中手動調用
import { createCheckpointer } from './src/workflow/checkpoint';

const checkpointer = await createCheckpointer();
await checkpointer.setup();  // 手動創建表
```

### 問題 12: Thread ID 衝突

**症狀**:
不同 Project ID 的對話混在一起。

**原因**:
Thread ID 生成邏輯錯誤。

**解決方案**:

檢查 thread_id 格式:

```typescript
// 正確格式
const threadId = `project:${projectId}`;  // 例如: "project:JCSC-1"

// 錯誤格式
const threadId = projectId;  // 可能導致衝突
```

驗證 checkpoint 數據:

```sql
SELECT
  DISTINCT thread_id
FROM checkpoints
ORDER BY thread_id;

-- 應該看到類似:
-- project:JCSC-1
-- project:JCSC-2
```

---

## Agent 與工作流

### 問題 13: 分類器失敗

**症狀**:
```
Classification failed: Response does not match expected format
```

**解決方案**:

1. 檢查 Prompt 格式

查看 `src/prompts/templates/classifier-prompt.ts`,確保要求 JSON 格式輸出。

2. 增加重試次數 (在 `.env` 中):

```bash
MAX_RETRIES=5  # 從 3 增加到 5
```

3. 使用更強大的模型:

```bash
OPENAI_MODEL=gpt-4o  # 從 gpt-4o-mini 升級
```

### 問題 14: Quality Evaluator 無限循環

**症狀**:
```
⚠️ Max retries (3) reached, using last response
```

**原因**:
質量評估閾值過高,導致不斷重試。

**解決方案**:

Quality Evaluator V2 已實現自適應閾值:
- 第 1 次: 75 分
- 第 2 次: 70 分
- 第 3 次: 65 分

如果仍有問題,降低初始閾值:

```typescript
// src/agents/quality-evaluator-v2.ts
const baseThreshold = 70;  // 從 75 降低到 70
```

### 問題 15: Handler Agent 回覆不相關

**症狀**:
Agent 回覆與問題無關或質量差。

**解決方案**:

1. 檢查 Prompt Engineering 配置

```typescript
// src/prompts/builders/prompt-builder.ts
const contextMode = 'full';  // 使用完整上下文模式
```

2. 增加知識庫內容

編輯 `src/prompts/contexts/` 下的知識庫文件,添加更多領域知識。

3. 檢查上下文是否正確注入

```typescript
// 調試時查看最終 Prompt
console.log('Final Prompt:', prompt);
```

---

## Streamlit 客戶端

### 問題 16: Streamlit 無法啟動

**症狀**:
```
ModuleNotFoundError: No module named 'streamlit'
```

**解決方案**:

1. 確保在正確的虛擬環境

```bash
cd streamlit_client

# 使用 uv (推薦)
uv sync

# 或使用 pip
pip install -r requirements.txt
```

2. 啟動 Streamlit

```bash
# 使用 uv
uv run streamlit run app.py

# 或直接運行
streamlit run app.py
```

### 問題 17: 無法連接後端 API

**症狀**:
```
ConnectionError: Failed to connect to http://localhost:3000
```

**解決方案**:

1. 確保後端服務運行

```bash
# 在另一個終端運行後端
npm run server:dev
```

2. 檢查 API 端點配置

```bash
# streamlit_client/.env
API_BASE_URL=http://localhost:3000
```

3. 測試 API 連接

```bash
curl http://localhost:3000/api/jira/health
```

### 問題 18: Checkpoint 服務連接失敗

**症狀**:
```
❌ Database connection failed
```

**解決方案**:

Streamlit 客戶端需要直接訪問 PostgreSQL:

```bash
# streamlit_client/.env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=jira_cs
POSTGRES_USER=jira_user
POSTGRES_PASSWORD=your_password
```

---

## 開發環境 (WSL)

### 問題 19: 命令在 PowerShell 中失敗

**症狀**:
```
npm ERR! command failed
bash: npm: command not found
```

**原因**:
根據 CLAUDE.md,所有開發命令必須在 WSL 中執行。

**解決方案**:

1. 切換到 WSL

```bash
# 在 Windows Terminal 中
wsl

# 導航到專案目錄
cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer
```

2. 驗證 WSL 環境

```bash
# 確認在 Linux 環境
uname -a
# 輸出應包含 "Linux" 和 "WSL2"

# 確認 Node.js 可用
node --version
npm --version
```

### 問題 20: WSL 與 Windows 路徑混淆

**症狀**:
```
No such file or directory: C:\Users\...
```

**解決方案**:

在 WSL 中使用 Linux 路徑格式:

```bash
# Windows 路徑
C:\Users\ALVIS.MC.TSAO\worKspace\JiraCSServer

# WSL 路徑
/mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer
```

---

## 依賴與安裝

### 問題 21: npm install 失敗

**症狀**:
```
npm ERR! ERESOLVE unable to resolve dependency tree
```

**解決方案**:

```bash
# 清理緩存
rm -rf node_modules
rm package-lock.json

# 使用 pnpm (推薦)
pnpm install

# 或強制安裝
npm install --legacy-peer-deps
```

### 問題 22: TypeScript 編譯錯誤

**症狀**:
```
TS2307: Cannot find module '@/types'
```

**解決方案**:

檢查 TypeScript 配置:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

運行類型檢查:

```bash
npm run type-check
```

---

## 性能問題

### 問題 23: 回應時間過長

**症狀**:
API 請求需要 30+ 秒才回應。

**原因**:
- LLM API 調用慢
- 資料庫查詢慢
- 上下文過大

**解決方案**:

1. 優化 LLM 調用

```bash
# 使用更快的模型
OPENAI_MODEL=gpt-4o-mini  # 而非 gpt-4o

# 減少 token 使用
CONTEXT_MAX_COMPRESSED_TOKENS=2000
```

2. 啟用資料庫連接池優化

```bash
DATABASE_MAX_CONNECTIONS=20
DATABASE_IDLE_TIMEOUT=10000
```

3. 查看慢查詢

```sql
-- 啟用慢查詢日誌
ALTER DATABASE jira_cs SET log_min_duration_statement = 1000;  -- 1 秒

-- 查看慢查詢
SELECT query, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 問題 24: 記憶體使用過高

**症狀**:
Node.js 進程佔用大量記憶體 (> 2GB)。

**解決方案**:

1. 限制 Node.js 記憶體

```bash
# 設置最大記憶體 (1GB)
NODE_OPTIONS="--max-old-space-size=1024" npm run server
```

2. 定期重啟服務 (生產環境)

```bash
# 使用 PM2
pm2 start npm --name "jira-cs-server" -- run server
pm2 restart jira-cs-server --cron "0 3 * * *"  # 每天 3 AM 重啟
```

---

## 獲取幫助

如果以上解決方案無法解決問題:

1. **查閱相關文檔**
   - [DATABASE_SETUP.md](./DATABASE_SETUP.md) - 資料庫設置
   - [LANGMEM_GUIDE.md](./LANGMEM_GUIDE.md) - LangMem 配置
   - [API.md](./API.md) - API 文檔

2. **檢查日誌**

```bash
# 查看應用日誌
npm run server:dev  # 開發模式有詳細日誌

# 查看資料庫日誌
tail -f /var/log/postgresql/postgresql-14-main.log
```

3. **啟用調試模式**

```bash
# 在 .env 中設置
LOG_LEVEL=debug
DEBUG=*
```

4. **提交 Issue**

訪問 [GitHub Issues](https://github.com/NikaisnotRubber/JiraCSServer/issues) 並提供:
- 錯誤訊息完整內容
- 操作步驟
- 環境信息 (OS, Node 版本等)
- 相關日誌

最後更新: 2025-10-27
版本: 2.0.0
