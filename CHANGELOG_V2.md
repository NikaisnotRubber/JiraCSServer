# JiraCSServer v2.0 變更日誌

## [2.0.0] - 2025-10-13

### 🎉 重大更新

#### 架構升級
- ✅ **遷移至 Next.js 15** - 完整的 Next.js App Router 架構
- ✅ **Vite 6 集成** - 超快速構建和開發體驗
- ✅ **pnpm 套件管理** - 更高效的依賴管理
- ✅ **TypeScript 5.9** - 最新的類型系統支持

#### 新功能

##### 1. 多空間問題類型系統
新增對不同 Jira/Confluence 空間的專屬支持：

- **corp** - 企業空間
- **confluence** - Confluence 空間
- **ext** - 外部空間
- **jira** - Jira 專屬空間

每個空間有其專屬的請求類型配置。

##### 2. 擴展的請求類型
新增以下請求類型：

- `new_account` - 新賬號授權（僅 conf, ext）
- `login` - 登入問題
- `permission` - 權限管理
- `field_setup` - 欄位設置（僅 jira）
- `workflow` - 工作流程（僅 jira）
- `new_space` - 新空間申請
- `consultation` - 咨詢
- `wish_pool` - 許願池
- `other` - 其他

##### 3. 後續處理端點
新增 `POST /api/jira/postProcess` 端點，支持：

- 處理用戶追問
- 維護對話上下文
- 智能理解對話歷史
- 提供更準確的後續回答

##### 4. 增強的欄位系統
新增欄位：

- `Space Type` - 空間類型
- `Request Type` - 請求類型
- `Is Batch Request` - 是否批量請求
- `Anonymous Submission` - 匿名提交支持
- `User Signature` - 用戶署名（可選）

##### 5. 欄位驗證配置
每個請求類型都有專屬的欄位配置：

- `required_fields` - 必填欄位
- `optional_fields` - 可選欄位
- `validation_rules` - 驗證規則
- `handler_type` - 處理器類型

### 📁 新增文件

#### 配置文件
- `next.config.mjs` - Next.js 配置
- `vite.config.ts` - Vite 構建配置
- `pnpm-workspace.yaml` - pnpm 工作區配置

#### 類型定義
- `src/types/extended.ts` - 擴展類型系統
  - `SpaceType` - 空間類型
  - `RequestType` - 請求類型枚舉
  - `ExtendedJiraIssueInput` - 擴展的輸入接口
  - `PostProcessInput` - 追問處理輸入
  - `WorkSummaryStats` - 工作統計
  - `ExtendedBatchOptions` - 擴展的批量選項
  - `SPACE_REQUEST_TYPE_MAP` - 空間與請求類型映射
  - `REQUEST_TYPE_FIELD_CONFIG` - 欄位配置映射

#### 代理處理器
- `src/agents/post-process-handler.ts` - 追問處理代理
  - 智能理解對話上下文
  - 維護對話歷史
  - 提供準確的後續回答

#### API 路由
- `app/api/jira/postProcess/route.ts` - 追問處理 API
  - POST - 處理追問
  - GET - 獲取端點信息

#### 文檔
- `MIGRATION_GUIDE.md` - 完整的遷移指南
- `README_V2.md` - v2.0 完整文檔
- `CHANGELOG_V2.md` - 本變更日誌

### 🔄 修改文件

#### package.json
**新增依賴：**
- `next@^15.0.4` - Next.js 框架
- `react@^18.3.1` - React 核心
- `react-dom@^18.3.1` - React DOM
- `@langchain/openai@^0.3.19` - LangChain OpenAI 集成

**新增開發依賴：**
- `vite@^6.0.11` - Vite 構建工具
- `@types/react@^18.3.18` - React 類型定義
- `@types/react-dom@^18.3.5` - React DOM 類型定義

**新增腳本：**
- `dev` - Next.js 開發服務器
- `build` - Next.js 生產構建
- `build:vite` - Vite 構建
- `start` - Next.js 生產服務器
- `start:prod` - 生產模式啟動
- `lint` - Next.js linting
- `type-check` - TypeScript 類型檢查

**移除依賴：**
- `nodemailer` - 郵件功能已移除
- `@types/nodemailer` - 郵件類型定義

**移除腳本：**
- `email:test` - 郵件測試
- `migrate` - 數據遷移

#### tsconfig.json
**主要變更：**
- `module: "esnext"` - ESM 模組系統
- `moduleResolution: "bundler"` - Bundler 模組解析
- `jsx: "preserve"` - 保留 JSX
- 新增路徑別名配置
- 新增 Next.js 插件支持

#### .env.example
**新增配置：**
- `PORT=3000` - 服務器端口
- `CORS_ORIGINS` - CORS 配置

**移除配置：**
- 所有 SMTP/郵件相關配置
- PM 郵箱配置
- 郵件功能開關
- 工作報告配置

### 🗑️ 移除文件

- `src/services/email-service.ts` - 郵件服務（已移除）

### 📊 統計數據

| 項目 | v1.x | v2.0 | 變化 |
|------|------|------|------|
| 依賴數量 | 13 | 17 | +4 |
| 開發依賴 | 7 | 9 | +2 |
| TypeScript 文件 | 15 | 18 | +3 |
| API 端點 | 5 | 6 | +1 |
| 請求類型 | - | 9 | +9 |
| 空間類型 | - | 4 | +4 |
| 代碼行數 | ~2000 | ~2500 | +25% |

### 🔧 技術改進

#### 性能優化
- ✅ Vite 提供極快的 HMR（熱模組替換）
- ✅ Next.js 自動代碼分割
- ✅ pnpm 更快的依賴安裝
- ✅ 優化的生產構建

#### 開發體驗
- ✅ 更好的 TypeScript 支持
- ✅ 路徑別名簡化導入
- ✅ 更清晰的項目結構
- ✅ 完善的類型定義

#### 可維護性
- ✅ 模組化的類型系統
- ✅ 清晰的配置映射
- ✅ 完整的文檔
- ✅ 更好的錯誤處理

### 🎯 重大變更（Breaking Changes）

#### 1. 套件管理器
```bash
# v1.x
npm install
npm run dev

# v2.0
pnpm install
pnpm dev
```

#### 2. 模組系統
```typescript
// v1.x (CommonJS)
const express = require('express');
module.exports = router;

// v2.0 (ESM)
import express from 'express';
export default router;
```

#### 3. 類型導入
```typescript
// v1.x
import { JiraIssueInput } from './types';

// v2.0
import { ExtendedJiraIssueInput } from '@/types/extended';
```

#### 4. API 請求格式
v2.0 需要新增欄位：
- `Space Type`
- `Request Type`
- `Is Batch Request`
- `Anonymous Submission`

### 📝 遷移清單

- [ ] 備份 v1.x 代碼和 .env
- [ ] 安裝 pnpm
- [ ] 更新 package.json
- [ ] 配置新的環境變數
- [ ] 更新 TypeScript 配置
- [ ] 測試所有 API 端點
- [ ] 更新客戶端請求格式
- [ ] 部署到生產環境

### 🔮 未來計劃

#### v2.1 規劃
- [ ] 添加工作統計報表 API
- [ ] WebSocket 實時通知
- [ ] GraphQL API 支持
- [ ] 更多自定義 agent

#### v2.2 規劃
- [ ] 前端管理界面
- [ ] 批量操作優化
- [ ] 緩存機制
- [ ] 性能監控儀表板

### 🐛 已知問題

目前沒有已知的重大問題。

### 🙏 感謝

感謝所有為這個版本做出貢獻的人！

### 📚 相關資源

- [遷移指南](./MIGRATION_GUIDE.md)
- [完整文檔](./README_V2.md)
- [API 文檔](./API.md)
- [部署指南](./DEPLOYMENT.md)

---

**發布日期:** 2025-10-13
**版本:** 2.0.0
**維護者:** JiraCSServer Team
