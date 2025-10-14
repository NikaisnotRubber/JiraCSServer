# JiraCSServer v2.0 Migration Guide

## 概覽

本指南幫助您從基於 Express 的 v1.x 架構遷移到使用 Next.js + TypeScript + Vite 的 v2.0 架構，並包含擴展功能。

## v2.0 新功能

### 架構變更

1. **Next.js 集成** - 現代化的 React 框架與 API 路由
2. **Vite 構建系統** - 快速、優化的生產環境打包
3. **pnpm 套件管理器** - 高效的依賴管理
4. **擴展的類型系統** - 支援多個空間（corp, confluence, ext, jira）
5. **後續處理端點** - 處理用戶的追問

### 新功能特性

#### 1. 多空間問題類型系統

不同的 Jira/Confluence 空間現在有專用的請求類型：

- **通用類型**（所有空間）：登入、權限、新空間申請、咨詢、許願池、其他
- **僅限 Confluence/Ext**：新賬號授權
- **僅限 Jira**：欄位設置、工作流程配置

#### 2. 增強的請求欄位

```typescript
interface ExtendedJiraIssueInput {
  forms: {
    // 核心欄位
    'Project ID': string;
    'Issue Type': string;
    'Reporter': string;
    'Space Type': 'corp' | 'confluence' | 'ext' | 'jira';
    'Request Type': RequestType;
    'Is Batch Request': boolean;
    'Anonymous Submission': boolean;
    'User Signature'?: string;
    // ... 更多欄位
  };
}
```

#### 3. 後續處理端點

用於處理追問的新端點：

```
POST /api/jira/postProcess
```

允許用戶對其問題提出澄清問題。

## 遷移步驟

### 步驟 1: 備份當前系統

```bash
# 備份當前代碼庫
cp -r /path/to/JiraCSServer /path/to/JiraCSServer-backup-v1

# 備份 .env 文件
cp .env .env.v1.backup
```

### 步驟 2: 使用 pnpm 安裝依賴

```bash
# 移除舊的 node_modules 和鎖定文件
rm -rf node_modules package-lock.json

# 全局安裝 pnpm（如果尚未安裝）
npm install -g pnpm

# 安裝依賴
pnpm install
```

### 步驟 3: 更新環境變數

根據 `.env.example` 更新您的 `.env` 文件：

```bash
# 複製示例文件
cp .env.example .env

# 編輯並添加您的配置
nano .env
```

**必需的環境變數：**

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1

# Jira Configuration
JIRA_BASE_URL=https://jirastage.deltaww.com
JIRA_AUTH_TOKEN=YWx2aXMuYWRtaW46UGFyYTk0Nzg=

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=3000

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Testing Configuration
TEST_MODE=false
```

### 步驟 4: 更新 TypeScript 配置

`tsconfig.json` 已更新以支援 Next.js。主要變更：

- 模組解析設置為 `bundler`
- 配置了路徑別名（`@/*`, `@types/*` 等）
- 啟用 Next.js 插件
- 啟用 JSX 保留

### 步驟 5: 遷移 API 路由（可選）

如果您有自定義 API 路由，可以將它們遷移到 Next.js API 路由：

**舊版（Express）:**
```typescript
// src/routes/custom.ts
router.get('/custom', (req, res) => {
  res.json({ data: 'custom' });
});
```

**新版（Next.js）:**
```typescript
// app/api/custom/route.ts
export async function GET(request: NextRequest) {
  return NextResponse.json({ data: 'custom' });
}
```

### 步驟 6: 運行開發服務器

```bash
# 啟動 Next.js 開發服務器
pnpm dev

# 或啟動獨立的 Express 服務器
pnpm run server:dev
```

### 步驟 7: 測試所有端點

測試新端點：

1. **Process 端點**（未變更）：
   ```bash
   curl -X POST http://localhost:3000/api/jira/process \
     -H "Content-Type: application/json" \
     -d @test-payload.json
   ```

2. **Post-Process 端點**（新增）：
   ```bash
   curl -X POST http://localhost:3000/api/jira/postProcess \
     -H "Content-Type: application/json" \
     -d '{
       "original_issue_key": "JCSC-123",
       "workflow_id": "abc-123",
       "follow_up_content": "可以再解釋一次嗎？",
       "user": "john.doe",
       "timestamp": "2025-10-13T00:00:00Z"
     }'
   ```

3. **批量處理**（未變更）：
   ```bash
   curl -X POST http://localhost:3000/api/jira/batch \
     -H "Content-Type: application/json" \
     -d '{"issues": [...], "options": {"parallel": true}}'
   ```

## API 兼容性

### 現有端點（未變更）

- `POST /api/jira/process` - 單一問題處理
- `POST /api/jira/batch` - 批量處理
- `GET /api/jira/health` - 健康檢查
- `GET /api/jira/info` - 系統信息
- `GET /api/jira/status/:workflowId` - 工作流狀態

### 新端點

- `POST /api/jira/postProcess` - 追問處理

## 重大變更

### 1. 套件管理器

- **v1.x**: 使用 npm
- **v2.0**: 使用 pnpm（更快、更高效）

### 2. 模組系統

- **v1.x**: CommonJS（`require/module.exports`）
- **v2.0**: ESM（`import/export`）

### 3. 構建系統

- **v1.x**: 僅 TypeScript 編譯器
- **v2.0**: Vite 用於優化構建

### 4. 類型導出

如果您從套件導入類型：

**舊版：**
```typescript
import { JiraIssueInput } from 'jiracsserver/types';
```

**新版：**
```typescript
import { ExtendedJiraIssueInput } from 'jiracsserver/types/extended';
```

## 新的請求類型配置

### 按空間驗證請求類型

```typescript
import { SPACE_REQUEST_TYPE_MAP, RequestType } from '@/types/extended';

// 檢查請求類型對空間是否有效
const isValid = SPACE_REQUEST_TYPE_MAP['jira'].includes(RequestType.FIELD_SETUP);
// true - 欄位設置可用於 Jira

const isValid2 = SPACE_REQUEST_TYPE_MAP['confluence'].includes(RequestType.FIELD_SETUP);
// false - 欄位設置不可用於 Confluence
```

### 請求類型欄位配置

```typescript
import { REQUEST_TYPE_FIELD_CONFIG, RequestType } from '@/types/extended';

// 獲取請求類型的配置
const config = REQUEST_TYPE_FIELD_CONFIG[RequestType.NEW_ACCOUNT];

console.log(config.required_fields);
// ['Reporter', 'Space Type', 'User Signature']

console.log(config.handler_type);
// 'simple'
```

## 生產環境部署

### 構建生產版本

```bash
# 構建 Next.js 應用
pnpm build

# 或使用 Vite 構建
pnpm run build:vite
```

### 啟動生產服務器

```bash
# 啟動 Next.js 生產服務器
pnpm start:prod

# 或啟動 Vite 構建
pnpm run server:prod
```

### 生產環境的環境變數

確保在生產環境中設置這些變數：

```env
NODE_ENV=production
OPENAI_API_KEY=your_production_key
JIRA_BASE_URL=https://your-jira-instance.com
# ... 其他生產配置
```

## 故障排除

### 問題：pnpm install 失敗

**解決方案：**
```bash
# 清除 pnpm 緩存
pnpm store prune

# 重試安裝
pnpm install
```

### 問題：模組解析錯誤

**解決方案：**
1. 檢查 `tsconfig.json` 路徑配置
2. 在 IDE 中重啟 TypeScript 服務器
3. 清除 `.next` 緩存：
   ```bash
   rm -rf .next
   pnpm dev
   ```

### 問題：@langchain 套件的導入錯誤

**解決方案：**
```bash
# 重新安裝 langchain 依賴
pnpm remove @langchain/core @langchain/langgraph @langchain/openai
pnpm add @langchain/core @langchain/langgraph @langchain/openai
```

## 回滾程序

如果需要回滾到 v1.x：

```bash
# 停止當前服務器
# 從備份恢復
rm -rf /path/to/JiraCSServer
cp -r /path/to/JiraCSServer-backup-v1 /path/to/JiraCSServer
cd /path/to/JiraCSServer

# 恢復環境
cp .env.v1.backup .env

# 重新安裝 v1 依賴
npm install

# 啟動 v1 服務器
npm run server
```

## 支援

如有問題或疑問：

1. 查看 [API 文檔](./API.md)
2. 查看 [部署指南](./DEPLOYMENT.md)
3. 查看 [README](./README.md)

## 變更摘要

| 功能 | v1.x | v2.0 |
|------|------|------|
| 框架 | Express | Next.js + Express |
| 構建工具 | TSC | Vite |
| 套件管理器 | npm | pnpm |
| 問題類型 | 通用 | 特定空間 |
| 後續處理端點 | ❌ | ✅ |
| 匿名提交 | ❌ | ✅ |
| 批量請求標記 | ❌ | ✅ |

## 後續步驟

成功遷移後：

1. **配置監控** - 為生產環境配置日誌和監控
2. **培訓用戶** - 教育用戶新的請求類型和欄位
3. **性能監控** - 追蹤處理時間和質量分數
4. **擴展功能** - 根據需求添加更多自定義功能

---

**最後更新：** 2025-10-13
**版本：** 2.0.0
