# Claude Code 項目規範 - Jira CS Server
# 注釋等内容請使用繁體中文
## 🎯 項目概述

這是一個基於 Next.js + TypeScript 的 Jira 客戶服務 Agent 工作流系統,使用 LangGraph 構建智能客服流程,並整合了 **LangGraph 原生 LangMem** 進行對話上下文自動持久化管理。

**版本**: 2.0.0
**主要技術棧**: Next.js 15, TypeScript, LangGraph, OpenAI, PostgreSQL, LangMem
**核心特性**: 自動化對話上下文管理,零配置記憶體系統

## 🖥️ 開發環境要求

### ⚠️ 重要:所有命令行操作必須在 WSL 環境中執行

**禁止在 Windows PowerShell 或 CMD 中運行項目命令!**

所有的開發、測試、資料庫操作都必須在 WSL (Windows Subsystem for Linux) 中進行。

### WSL 環境設置

1. **進入 WSL**:
   ```bash
   # 在 Windows Terminal 中
   wsl
   ```

2. **導航到項目目錄**:
   ```bash
   cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer
   ```

3. **驗證環境**:
   ```bash
   # 應該看到 Linux 環境
   uname -a
   # 輸出示例: Linux ... WSL2 ...
   ```

### 必需的工具 (在 WSL 中)

- **Node.js**: >= 18.0.0
- **npm** 或 **pnpm**: >= 9.0.0
- **PostgreSQL**: >= 14 (可使用 Docker)
- **TypeScript**: 5.7.2

## 📁 項目結構

```
JiraCSServer/
├── src/
│   ├── agents/              # Agent 實現 (V1, V2, Mock)
│   │   ├── classifier*.ts
│   │   ├── *-handler*.ts
│   │   └── quality-evaluator*.ts
│   ├── clients/             # 外部 API 客戶端
│   │   └── jira-client.ts
│   ├── database/            # 🆕 資料庫層 (PostgreSQL + Drizzle)
│   │   ├── config.ts        # 資料庫配置
│   │   ├── schema.ts        # Drizzle ORM Schema
│   │   └── client.ts        # 連接池與客戶端
│   ├── services/            # 🆕 業務邏輯服務層
│   │   ├── context-manager.ts     # 上下文 CRUD
│   │   ├── context-compressor.ts  # LLM 壓縮
│   │   └── context-retriever.ts   # 上下文檢索
│   ├── prompts/             # Prompt 工程
│   │   ├── builders/        # Prompt 構建器
│   │   ├── contexts/        # 知識庫上下文
│   │   └── templates/       # Prompt 模板
│   ├── workflow/            # LangGraph 工作流
│   │   ├── graph.ts         # 工作流圖定義
│   │   ├── orchestrator.ts  # 工作流編排器
│   │   └── state.ts         # 工作流狀態管理
│   ├── routes/              # API 路由
│   ├── types/               # TypeScript 類型定義
│   ├── utils/               # 工具函數
│   │   ├── config.ts
│   │   ├── workflow-logger.ts
│   │   └── database-maintenance.ts  # 🆕 資料庫維護工具
│   └── tests/               # 測試文件
├── .env                     # 環境變數 (不提交)
├── .env.example             # 環境變數示例
├── package.json
├── tsconfig.json
├── docker/                  # 🆕 Docker 配置
│   └── init-db.sh           # PostgreSQL 初始化腳本
├── docker-compose.yml       # 🆕 Docker Compose 配置 (含 PostgreSQL)
├── Dockerfile               # Docker 構建文件
├── CONTEXT_STORAGE.md       # 🆕 上下文系統完整文檔
├── QUICKSTART_CONTEXT.md    # 🆕 快速開始指南
├── DOCKER_DEPLOYMENT.md     # 🆕 Docker 部署指南
└── CLAUDE.md               # 本文件
```

## 🚀 開發流程 (在 WSL 中)

### 1. 安裝依賴

```bash
# 必須在 WSL 中執行
cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer

# 安裝依賴
npm install
# 或使用 pnpm
pnpm install
```

### 2. 環境配置

```bash
# 複製環境變數模板
cp .env.example .env

# 使用 WSL 編輯器編輯 .env
nano .env
# 或
vim .env
```

**必需的環境變數**:

```bash
# OpenAI API
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o

# Jira API
JIRA_BASE_URL=https://jirastage.deltaww.com
JIRA_AUTH_TOKEN=your-token-here

# PostgreSQL (上下文存儲系統)
DATABASE_URL=postgresql://postgres:password@localhost:5432/jira_cs
```

### 3. PostgreSQL 設置 (在 WSL 中)

**推薦:使用 Docker**

```bash
# 在 WSL 中啟動 PostgreSQL
docker run --name jira-cs-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=jira_cs \
  -p 5432:5432 \
  -d postgres:16

# 驗證運行
docker ps | grep jira-cs-postgres
```

**初始化資料庫表**:

```bash
# 必須在 WSL 中執行
npm run db:init
```

### 4. 運行開發服務器

```bash
# 開發模式 (Next.js)
npm run dev

# 或運行 Express 服務器
npm run server:dev

# Mock 模式測試
npm run test:mock
```

## 📝 NPM Scripts (必須在 WSL 中執行)

### 應用運行

```bash
npm run dev              # Next.js 開發服務器
npm run build            # 構建生產版本
npm run start            # 啟動生產服務器
npm run server           # Express 服務器
npm run server:dev       # Express 開發模式
```

### 測試

```bash
npm run test             # 運行所有測試
npm run test:mock        # Mock 模式測試 (不調用 API)
npm run test:api         # API 測試
npm run type-check       # TypeScript 類型檢查
```

### 資料庫操作 (🆕 上下文系統)

```bash
npm run db:init          # 初始化資料庫表
npm run db:stats         # 查看資料庫統計
npm run db:maintain      # 運行維護任務 (清理 + 壓縮)
npm run db:generate      # 生成 Drizzle migrations
npm run db:migrate       # 執行 migrations
npm run db:studio        # 打開 Drizzle Studio (可視化)
```

### 維護工具 CLI

```bash
# 必須在 WSL 中執行
node src/utils/database-maintenance.ts <command>

# 可用命令:
# init          - 初始化資料庫表
# stats         - 顯示統計信息
# maintain      - 運行完整維護
# compress <id> - 壓縮特定專案
# optimize      - 優化資料庫性能
```

## 🗄️ 上下文存儲系統

### 核心概念

本系統實現了基於 PostgreSQL 的對話上下文管理:

1. **Project ID 索引**: 使用 Jira Project ID (如 "JCSC-1") 作為上下文標識
2. **智能壓縮**: 使用 LLM 壓縮歷史對話,保留關鍵信息
3. **自動注入**: 後續追問自動獲得完整歷史上下文

### 資料表結構

- **project_contexts**: 專案級上下文 (壓縮摘要 + 完整歷史)
- **conversation_turns**: 詳細對話記錄
- **compression_history**: 壓縮操作審計

### 自動化工作流

```
用戶請求 (Project ID: JCSC-1)
    ↓
加載歷史上下文 (from PostgreSQL)
    ↓
注入到 Agent Prompt
    ↓
Agent 處理 (含歷史上下文)
    ↓
保存本次互動 (to PostgreSQL)
    ↓
檢查是否需要壓縮 (turns > 5 或 tokens > 10000)
    ↓
[如需要] LLM 壓縮 → 更新資料庫
```

### 壓縮策略

- **觸發條件**: 對話輪數 > 5 或總 tokens > 10000
- **保留**: 最近 3 輪完整對話
- **壓縮內容**:
  - 整體摘要
  - 關鍵技術細節
  - 未解決問題
  - 重要決策/方案
- **壓縮模型**: GPT-4o-mini

### 詳細文檔

- **完整技術文檔**: [CONTEXT_STORAGE.md](./CONTEXT_STORAGE.md)
- **快速開始**: [QUICKSTART_CONTEXT.md](./QUICKSTART_CONTEXT.md)

## 🏗️ 架構設計

### Agent Workflow (LangGraph)

```
START
  ↓
Classifier (分類器)
  ↓
┌─────────────┬─────────────┬─────────────┐
│ Login       │ Complex     │ General     │
│ Handler     │ Handler     │ Handler     │
└─────────────┴─────────────┴─────────────┘
  ↓
Quality Evaluator (質量評估)
  ↓
[如需改進] → Retry Handler
  ↓
Finalize Response
  ↓
Log Response
  ↓
Send to Jira
  ↓
END
```

### Agent 版本

- **V1 Agents**: 基礎版本
- **V2 Agents**: 增強 Prompt 工程,更好的上下文處理
- **Mock Agents**: 測試用,不調用外部 API

切換方式:在 `.env` 中設置 `USE_V2_AGENTS=true`

### Prompt 工程架構

```
PromptBuilder
    ↓
ContextAssembler
    ├─ StateContextExtractor (從工作流狀態提取)
    ├─ 🆕 HistoricalContext (從資料庫加載歷史)
    ├─ JiraKnowledgeBase (Jira 知識庫)
    ├─ TechnicalProcedures (技術流程)
    ├─ TroubleshootingGuides (故障排除)
    └─ ResponsePatterns (回應模式)
```

## 🔧 開發規範

### TypeScript 規範

1. **嚴格類型**: 啟用 `strict` 模式
2. **類型導出**: 優先使用 `interface`,複雜類型用 `type`
3. **錯誤處理**: 使用 `try-catch` 並提供明確錯誤信息
4. **異步操作**: 優先使用 `async/await`

### 代碼組織

1. **單一職責**: 每個文件/類專注一個功能
2. **依賴注入**: 避免硬編碼依賴
3. **配置外部化**: 所有配置從環境變數讀取
4. **日誌規範**: 使用統一的 console.log 格式:
   ```typescript
   console.log('🚀 Starting...')    // 啟動
   console.log('✅ Success...')     // 成功
   console.log('❌ Error...')       // 錯誤
   console.log('⚠️ Warning...')     // 警告
   console.log('📊 Stats...')       // 統計
   console.log('🗜️ Compressing...') // 壓縮
   console.log('📚 Context loaded') // 上下文
   ```

### Git 工作流

```bash
# 必須在 WSL 中執行 git 操作
git checkout -b feature/your-feature
git add .
git commit -m "feat: description"
git push origin feature/your-feature
```

**Commit 規範**:
- `feat:` 新功能
- `fix:` Bug 修復
- `docs:` 文檔更新
- `refactor:` 代碼重構
- `test:` 測試相關
- `chore:` 構建/工具配置

## 🧪 測試策略

### 測試類型

1. **Mock 測試** (推薦開發時使用)
   ```bash
   # 在 WSL 中
   npm run test:mock
   ```
   - 不調用外部 API
   - 快速反饋
   - 測試工作流邏輯

2. **API 測試**
   ```bash
   # 在 WSL 中
   npm run test:api
   ```
   - 調用真實 OpenAI API
   - 需要有效的 API Key

3. **上下文系統測試**
   ```bash
   # 測試同一 Project ID 的多次互動
   # 驗證歷史上下文加載
   ```

### 測試數據

測試數據位於 [src/tests/mock-data.ts](src/tests/mock-data.ts):
- 8 個預定義的 Jira Issue
- 涵蓋所有分類類型
- 包含中文內容

## 🔐 安全規範

### 環境變數

- ❌ **絕對不要提交 `.env` 文件**
- ✅ 使用 `.env.example` 作為模板
- ✅ 敏感信息只存儲在本地 `.env`

### API Keys

- OpenAI API Key
- Jira Auth Token
- Database 連接字符串

**這些都不應該出現在代碼中!**

## 📊 監控與維護

### 資料庫健康檢查 (在 WSL 中)

```bash
# 查看統計
npm run db:stats

# 輸出示例:
# {
#   "totalProjects": 150,
#   "totalTurns": 2500,
#   "projectsWithCompression": 45,
#   "avgTurnsPerProject": 16.7,
#   "dbHealth": { "healthy": true, ... }
# }
```

### 定期維護

**建議**:設置 cron job 每天運行維護

```bash
# 在 WSL 中編輯 crontab
crontab -e

# 添加:每天凌晨 2 點運行維護
0 2 * * * cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer && npm run db:maintain
```

維護任務包括:
- 清理 90 天前的舊對話記錄
- 壓縮需要壓縮的專案上下文
- 優化資料庫性能

### 日誌查看

```bash
# 在 WSL 中查看應用日誌
# (日誌位置根據配置決定)
tail -f /var/log/jira-cs-server.log
```

## 🐛 故障排查

### 常見問題

#### 1. 資料庫連接失敗

**症狀**:
```
⚠️ Database initialization failed, context features disabled
```

**解決方案** (在 WSL 中):
```bash
# 檢查 PostgreSQL 是否運行
docker ps | grep postgres

# 檢查連接
psql $DATABASE_URL -c "SELECT 1"

# 查看日誌
docker logs jira-cs-postgres
```

#### 2. npm install 失敗

**症狀**: 依賴安裝錯誤

**解決方案** (在 WSL 中):
```bash
# 清理緩存
rm -rf node_modules
rm package-lock.json

# 重新安裝
npm install
```

#### 3. TypeScript 編譯錯誤

**症狀**: `tsc` 報錯

**解決方案** (在 WSL 中):
```bash
# 類型檢查
npm run type-check

# 查看具體錯誤
npx tsc --noEmit
```

#### 4. 上下文未加載

**症狀**:
```
📭 No existing context for project JCSC-1
```

**這是正常的!** 表示這是該專案的首次互動。再次使用相同 Project ID 就會加載上下文。

### 日誌級別

在 `.env` 中設置:
```bash
LOG_LEVEL=debug  # 詳細日誌
LOG_LEVEL=info   # 一般日誌 (默認)
LOG_LEVEL=error  # 僅錯誤
```

## 📚 重要文件

### 必讀文檔

1. **[CLAUDE.md](./CLAUDE.md)** (本文件) - 項目規範
2. **[LANGMEM_GUIDE.md](./LANGMEM_GUIDE.md)** - ⭐ LangMem 整合指南 (重要!)
3. **[CONTEXT_STORAGE.md](./CONTEXT_STORAGE.md)** - 自定義上下文系統文檔 (補充)
4. **[QUICKSTART_CONTEXT.md](./QUICKSTART_CONTEXT.md)** - 快速開始指南
5. **[PROMPT_ENGINEERING_GUIDE.md](./PROMPT_ENGINEERING_GUIDE.md)** - Prompt 工程指南

### 核心代碼

**工作流**:
- [src/workflow/graph.ts](src/workflow/graph.ts) - LangGraph 定義
- [src/workflow/orchestrator.ts](src/workflow/orchestrator.ts) - 工作流編排
- [src/workflow/checkpoint.ts](src/workflow/checkpoint.ts) - ⭐ LangMem Checkpoint 配置
- [src/workflow/state.ts](src/workflow/state.ts) - 狀態管理

**LangMem 系統** (主要):
- [src/workflow/checkpoint.ts](src/workflow/checkpoint.ts) - PostgresSaver 配置
- PostgreSQL checkpoint 表 (自動創建)

**自定義上下文系統** (補充,用於分析):
- [src/services/context-manager.ts](src/services/context-manager.ts) - CRUD
- [src/services/context-compressor.ts](src/services/context-compressor.ts) - 壓縮
- [src/services/context-retriever.ts](src/services/context-retriever.ts) - 檢索

**資料庫**:
- [src/database/schema.ts](src/database/schema.ts) - Schema 定義
- [src/database/client.ts](src/database/client.ts) - 連接池

**測試**:
- [src/tests/test-langmem.ts](src/tests/test-langmem.ts) - LangMem 整合測試

## 🎓 學習路徑

### 新手上手

1. ✅ 閱讀本文件 (CLAUDE.md)
2. ✅ 設置 WSL 環境
3. ✅ 安裝依賴: `npm install`
4. ✅ 設置 PostgreSQL
5. ✅ 初始化資料庫: `npm run db:init`
6. ✅ 運行測試: `npm run test:mock`
7. ✅ 閱讀 [QUICKSTART_CONTEXT.md](./QUICKSTART_CONTEXT.md)

### 深入理解

1. 📖 研究 LangGraph 工作流
2. 📖 理解 Prompt 工程策略
3. 📖 學習上下文壓縮機制
4. 📖 閱讀 [CONTEXT_STORAGE.md](./CONTEXT_STORAGE.md)

### 進階開發

1. 🔧 自定義 Agent 行為
2. 🔧 優化 Prompt 模板
3. 🔧 調整壓縮策略
4. 🔧 實現新功能

## ⚠️ 重要提醒

### WSL 強制要求

**所有以下操作必須在 WSL 中執行:**

- ✅ npm/pnpm 命令
- ✅ 資料庫操作
- ✅ Git 操作
- ✅ 開發服務器
- ✅ 測試運行
- ✅ 構建命令

**Windows PowerShell/CMD 僅用於:**
- ❌ 無 (所有開發操作都在 WSL 中)

### 進入 WSL 的方式

```bash
# 方式 1: Windows Terminal
wsl

# 方式 2: 直接指定目錄
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer && bash"

# 方式 3: VSCode 中
# 使用 Remote-WSL 擴展
```

### 路徑轉換

```bash
# Windows 路徑: C:\Users\ALVIS.MC.TSAO\worKspace\JiraCSServer
# WSL 路徑:     /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer
```

## 🚀 快速參考

```bash
# === 進入 WSL ===
wsl
cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer

# === 日常開發 ===
npm run dev              # 開發服務器
npm run test:mock        # 測試

# === 資料庫 ===
npm run db:stats         # 統計
npm run db:maintain      # 維護

# === Git ===
git status
git add .
git commit -m "feat: ..."
git push
```

## 📞 支援

- **文檔問題**: 查看 `docs/` 目錄
- **Bug 報告**: 提交 GitHub Issue
- **功能請求**: 提交 Pull Request

---

**最後更新**: 2025-10-20
**維護者**: ALVIS.MC.TSAO
**版本**: 2.0.0 (包含上下文存儲系統)
