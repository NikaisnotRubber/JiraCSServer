# Database Setup Guide

本文檔統一說明 JiraCSServer 項目的 PostgreSQL 資料庫設置流程,適用於所有模組 (Context Storage, LangMem Checkpoints, Streamlit Client)。

## 前置條件

- PostgreSQL 14+ 已安裝並運行
- WSL 環境 (所有命令行操作必須在 WSL 中執行)
- Node.js >= 18.0.0
- npm 或 pnpm >= 9.0.0

## 資料庫架構概覽

JiraCSServer 使用 PostgreSQL 作為持久化存儲,包含以下資料表:

### LangMem Checkpoints (自動創建)
由 LangGraph PostgresSaver 自動管理,用於對話上下文持久化:
- `checkpoints` - 工作流狀態快照
- `checkpoint_writes` - 檢查點寫入記錄
- `checkpoint_blobs` - 大型數據塊存儲

### Custom Context Storage (手動創建)
用於上下文分析和壓縮:
- `project_contexts` - 專案級上下文摘要
- `conversation_turns` - 詳細對話記錄
- `compression_history` - 壓縮操作審計

## 安裝步驟

### 步驟 1: 安裝 PostgreSQL

**使用 Docker (推薦)**

```bash
# 在 WSL 中執行
docker run --name jira-cs-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=jira_cs \
  -p 5432:5432 \
  -d postgres:16

# 驗證運行
docker ps | grep jira-cs-postgres
```

**或使用本地安裝**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-14 postgresql-contrib

# 啟動服務
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 步驟 2: 創建資料庫和用戶

```bash
# 在 WSL 中執行
sudo -u postgres psql

# 在 psql 提示符中執行:
CREATE DATABASE jira_cs;
CREATE USER jira_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jira_cs TO jira_user;
\q
```

### 步驟 3: 配置環境變數

複製 `.env.example` 到 `.env`:

```bash
cp .env.example .env
```

編輯 `.env` 文件,配置資料庫連接:

```bash
# PostgreSQL 連接 (兩種方式選一種)

# 方式 1: 使用 DATABASE_URL (推薦)
DATABASE_URL=postgresql://jira_user:your_password@localhost:5432/jira_cs

# 方式 2: 使用個別變數
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=jira_cs
DATABASE_USER=jira_user
DATABASE_PASSWORD=your_password
DATABASE_SSL=false

# 連接池配置
DATABASE_MAX_CONNECTIONS=10
DATABASE_IDLE_TIMEOUT=30000
DATABASE_CONNECTION_TIMEOUT=5000
```

### 步驟 4: 初始化資料庫表

**自動初始化 (推薦)**

```bash
# 在 WSL 中執行
npm run db:init
```

這將自動創建:
- Custom Context Storage 表 (project_contexts, conversation_turns, compression_history)
- LangMem Checkpoint 表 (在首次運行時自動創建)

**或手動初始化**

```bash
# 在 WSL 中執行
node src/utils/database-maintenance.ts init
```

### 步驟 5: 驗證安裝

```bash
# 查看資料庫統計
npm run db:stats

# 預期輸出:
# {
#   "totalProjects": 0,
#   "totalTurns": 0,
#   "projectsWithCompression": 0,
#   "dbHealth": { "healthy": true, ... }
# }
```

## 資料表詳細定義

### 1. project_contexts

存儲專案級上下文摘要和完整歷史。

```sql
CREATE TABLE project_contexts (
  project_id VARCHAR(50) PRIMARY KEY,
  compressed_context JSONB,
  raw_history JSONB[],
  total_interactions INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_project_contexts_last_updated ON project_contexts(last_updated);
```

**欄位說明**:
- `project_id`: Jira Project ID (如 "JCSC-1")
- `compressed_context`: LLM 壓縮後的上下文摘要
- `raw_history`: 完整對話歷史陣列
- `total_interactions`: 總互動次數
- `total_tokens`: 累計 token 使用量
- `last_updated`: 最後更新時間
- `created_at`: 創建時間
- `metadata`: 額外元數據

### 2. conversation_turns

詳細記錄每次對話的問題、回答、分類和質量評分。

```sql
CREATE TABLE conversation_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) REFERENCES project_contexts(project_id),
  workflow_id VARCHAR(100),
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
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversation_turns_project_id ON conversation_turns(project_id);
CREATE INDEX idx_conversation_turns_created_at ON conversation_turns(created_at);
CREATE INDEX idx_conversation_turns_workflow_id ON conversation_turns(workflow_id);
```

### 3. compression_history

追蹤壓縮操作,用於調試和分析。

```sql
CREATE TABLE compression_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) REFERENCES project_contexts(project_id),
  original_turns INTEGER NOT NULL,
  original_tokens INTEGER NOT NULL,
  compressed_tokens INTEGER NOT NULL,
  compression_ratio INTEGER NOT NULL,
  strategy VARCHAR(50),
  model VARCHAR(50),
  compressed_content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_compression_history_project_id ON compression_history(project_id);
CREATE INDEX idx_compression_history_created_at ON compression_history(created_at);
```

### 4. checkpoints (LangMem 自動創建)

由 LangGraph PostgresSaver 自動管理,無需手動創建。

```sql
-- LangGraph 會在首次運行時自動創建以下表:
-- checkpoints
-- checkpoint_writes
-- checkpoint_blobs
```

## 資料庫維護

### 日常維護操作

```bash
# 查看統計信息
npm run db:stats

# 運行完整維護 (清理 + 壓縮)
npm run db:maintain

# 壓縮特定專案
node src/utils/database-maintenance.ts compress JCSC-1

# 優化資料庫性能
node src/utils/database-maintenance.ts optimize
```

### 定期維護 (建議)

設置 cron job 每天運行維護:

```bash
# 在 WSL 中編輯 crontab
crontab -e

# 添加:每天凌晨 2 點運行維護
0 2 * * * cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer && npm run db:maintain
```

維護任務包括:
- 清理 90 天前的舊對話記錄
- 壓縮需要壓縮的專案上下文
- 優化資料庫性能 (VACUUM, ANALYZE)

### 備份與恢復

```bash
# 備份資料庫
pg_dump -U jira_user -h localhost jira_cs > backup_$(date +%Y%m%d).sql

# 恢復資料庫
psql -U jira_user -h localhost jira_cs < backup_20251020.sql
```

## 性能優化

### 連接池配置

在 `.env` 中調整連接池參數:

```bash
# 最大連接數 (建議 10-20)
DATABASE_MAX_CONNECTIONS=10

# 閒置連接超時 (毫秒)
DATABASE_IDLE_TIMEOUT=30000

# 連接超時 (毫秒)
DATABASE_CONNECTION_TIMEOUT=5000
```

### 索引優化

系統已自動創建以下索引:
- `project_id` 主鍵索引
- `last_updated` 時間索引
- `created_at` 時間索引
- `workflow_id` 索引

如需額外優化,可手動添加:

```sql
-- 複合索引 (根據查詢模式調整)
CREATE INDEX idx_turns_project_created ON conversation_turns(project_id, created_at DESC);
```

## 故障排查

### 問題 1: 資料庫連接失敗

**症狀**:
```
⚠️ Database initialization failed, context features disabled
```

**解決方案**:

1. 檢查 PostgreSQL 是否運行

```bash
# Docker
docker ps | grep postgres

# 本地安裝
sudo systemctl status postgresql
```

2. 驗證 DATABASE_URL 正確性

```bash
# 測試連接
psql $DATABASE_URL -c "SELECT 1"
```

3. 檢查防火牆設置

```bash
# 確保 5432 端口開放
sudo ufw allow 5432/tcp
```

### 問題 2: 權限錯誤

**症狀**:
```
permission denied for table project_contexts
```

**解決方案**:

```sql
-- 授予完整權限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jira_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jira_user;
```

### 問題 3: 表已存在

**症狀**:
```
relation "project_contexts" already exists
```

**解決方案**:

如果需要重新初始化:

```bash
# 警告:這將刪除所有數據!
# 僅在開發環境使用

# 連接到資料庫
psql $DATABASE_URL

# 刪除表
DROP TABLE IF EXISTS compression_history CASCADE;
DROP TABLE IF EXISTS conversation_turns CASCADE;
DROP TABLE IF EXISTS project_contexts CASCADE;
\q

# 重新初始化
npm run db:init
```

### 問題 4: LangMem Checkpoint 表未創建

**症狀**:
```
relation "checkpoints" does not exist
```

**解決方案**:

LangMem checkpoint 表會在首次運行工作流時自動創建。如果未創建:

```bash
# 運行一次簡單測試
npm run test:langmem
```

這將觸發 checkpoint 表的自動創建。

## Docker Compose 部署

如果使用 Docker Compose 部署整個系統:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    container_name: jira-cs-postgres
    environment:
      - POSTGRES_DB=jira_cs
      - POSTGRES_USER=jira_user
      - POSTGRES_PASSWORD=your_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jira_user -d jira_cs"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
    driver: local
```

啟動:

```bash
# 在 WSL 中執行
docker-compose up -d postgres

# 等待健康檢查通過
docker-compose ps
```

## 安全最佳實踐

1. **使用強密碼**
   - 資料庫密碼應包含大小寫字母、數字和特殊字符
   - 至少 16 個字符

2. **限制網絡訪問**
   - 僅允許必要的 IP 訪問資料庫
   - 使用防火牆規則

3. **啟用 SSL (生產環境)**

```bash
# 在 .env 中設置
DATABASE_SSL=true
```

4. **定期備份**
   - 每天自動備份
   - 測試恢復流程

5. **監控資料庫**
   - 設置告警 (連接數、磁碟空間)
   - 定期查看慢查詢日誌

## 相關文檔

- [Context Storage System](./CONTEXT_STORAGE.md) - 上下文存儲系統技術文檔
- [LangMem Guide](./LANGMEM_GUIDE.md) - LangGraph 記憶體管理指南
- [CLAUDE.md](../CLAUDE.md) - 項目總規範
- [Troubleshooting](./TROUBLESHOOTING.md) - 統一故障排查指南

## 支援

如有資料庫相關問題:
1. 查閱本文檔的「故障排查」章節
2. 查閱 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. 檢查 [GitHub Issues](https://github.com/NikaisnotRubber/JiraCSServer/issues)

最後更新: 2025-10-27
版本: 2.0.0
