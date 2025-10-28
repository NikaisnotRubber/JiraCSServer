# Streamlit 客戶端整合文檔

## 📋 概述

本文檔說明 Jira CS Server 項目中新增的 Streamlit 客戶端,該客戶端提供了一個友好的 Web UI 來與後端 AI 客服系統進行交互。

## 🎯 客戶端特性

### 核心功能

1. **基礎聊天機器人功能**
   - 實時與 AI 對話
   - 自然語言問答
   - 多輪對話支持

2. **會話歷史管理**
   - 查看所有歷史會話
   - 恢復歷史對話
   - 會話篩選(按狀態)
   - 會話刪除

3. **問題狀態記錄**
   - Open: 問題待處理
   - Pending: 問題處理中
   - Closed: 問題已解決
   - 實時狀態更新

4. **LangMem Checkpoint 整合**
   - 自動上下文持久化
   - 跨會話記憶
   - 基於 Project ID 的上下文追蹤
   - 直接訪問 PostgreSQL checkpoint 表

### 技術架構

```
Streamlit UI
    ↓
API Client (HTTP)
    ↓
Jira CS Server (Next.js API)
    ↓
LangGraph Workflow
    ↓
PostgreSQL (LangMem Checkpoints)
```

## 📁 項目結構

```
JiraCSServer/
├── streamlit_client/          # 🆕 Streamlit 客戶端
│   ├── app.py                 # 主程序入口
│   ├── pyproject.toml         # uv 項目配置
│   ├── .python-version        # Python 版本
│   ├── .env.example           # 環境變數模板
│   ├── run.sh                 # 啟動腳本
│   ├── README.md              # 客戶端文檔
│   ├── QUICKSTART.md          # 快速開始指南
│   ├── config/                # 配置模組
│   │   └── settings.py        # 全局設定
│   ├── services/              # 服務層
│   │   ├── api_client.py      # API 客戶端
│   │   ├── session_manager.py # 會話管理
│   │   └── checkpoint_service.py # Checkpoint 服務
│   ├── components/            # UI 組件
│   │   ├── chat_interface.py  # 聊天界面
│   │   └── sidebar.py         # 側邊欄
│   ├── utils/                 # 工具函數
│   └── data/sessions/         # 會話數據存儲
└── (其他現有文件...)
```

## 🚀 快速啟動

### 前置條件

1. **後端服務運行**: Jira CS Server 在 `http://localhost:3000`
2. **PostgreSQL 運行**: 資料庫在 `localhost:5432`
3. **uv 已安裝**: Python 包管理工具

### 啟動步驟

```bash
# 1. 進入客戶端目錄
cd streamlit_client

# 2. 複製環境變數(首次運行)
cp .env.example .env

# 3. 使用啟動腳本(推薦)
./run.sh

# 或手動啟動
uv sync
uv run streamlit run app.py
```

### 訪問應用

打開瀏覽器訪問: **http://localhost:8501**

## 🔌 API 整合說明

### 使用的後端端點

客戶端調用以下 API 端點:

1. **POST /api/jira/process_test**
   - 處理用戶問題
   - 測試模式(不發送到 Jira)
   - 返回 AI 回應和元數據

2. **GET /api/jira/health**
   - 系統健康檢查
   - 用於監控後端狀態

3. **GET /api/jira/info**
   - 獲取系統信息
   - API 版本和限制

### 請求流程

```
用戶輸入
    ↓
API Client (api_client.py)
    ↓
POST /api/jira/process_test
    {
      "forms": {
        "Project ID": "JCSC-1",
        "Comment": { "Content": "用戶問題" }
      }
    }
    ↓
後端處理(LangGraph Workflow)
    ↓
響應
    {
      "success": true,
      "data": {
        "comment_content": "AI 回答",
        "classification": {...},
        "quality_score": 0.88
      }
    }
    ↓
顯示給用戶
```

## 🗄️ 資料存儲

### 本地會話存儲

- **位置**: `streamlit_client/data/sessions/`
- **格式**: JSON 文件
- **命名**: `{project_id}.json`
- **內容**: 會話元數據、訊息歷史、狀態

**示例**:
```json
{
  "session_id": "JCSC-1",
  "title": "登入問題諮詢",
  "status": "open",
  "created_at": "2025-10-26T10:00:00",
  "updated_at": "2025-10-26T10:30:00",
  "messages": [
    {
      "role": "user",
      "content": "如何重置密碼?",
      "timestamp": "2025-10-26T10:00:00"
    },
    {
      "role": "assistant",
      "content": "您可以通過以下步驟...",
      "timestamp": "2025-10-26T10:00:05",
      "metadata": {
        "classification": {...},
        "quality_score": 0.88
      }
    }
  ]
}
```

### LangMem Checkpoint 整合

客戶端直接訪問 PostgreSQL 中的 checkpoint 表:

- **checkpoints**: 主 checkpoint 表
- **checkpoint_writes**: Checkpoint 寫入記錄

**功能**:
- 檢查 Project ID 是否有 checkpoint
- 列出所有 checkpoints
- 獲取 checkpoint 統計
- 刪除 checkpoint

## 🎨 UI 組件說明

### 主界面 (app.py)

- 頁面配置
- Session State 初始化
- 組件編排

### 聊天界面 (chat_interface.py)

- 訊息渲染
- 用戶輸入處理
- 元數據展示
- 錯誤處理

### 側邊欄 (sidebar.py)

- **系統狀態**: 後端健康、資料庫連接
- **新會話創建**: 表單和驗證
- **會話操作**: 狀態更新、刪除
- **會話歷史**: 列表、篩選、加載
- **設置**: 報告者姓名等

## 🔧 配置選項

### 環境變數 (.env)

```bash
# 後端 API
BACKEND_API_URL=http://localhost:3000

# 資料庫
DATABASE_URL=postgresql://postgres:password@localhost:5432/jira_cs
DATABASE_MAX_CONNECTIONS=5
DATABASE_IDLE_TIMEOUT=30000

# 會話存儲
SESSION_STORAGE_PATH=./streamlit_client/data/sessions
```

### 設定文件 (config/settings.py)

```python
# API 配置
class APIConfig:
    base_url = "http://localhost:3000"
    timeout = 120
    max_retries = 3

# UI 配置
class UIConfig:
    page_title = "Jira CS Assistant"
    page_icon = "🤖"
    status_options = ["open", "pending", "closed"]
    max_history_display = 50

# 會話配置
class SessionConfig:
    storage_path = "./streamlit_client/data/sessions"
    auto_save = True
    session_expiry_days = 30
```

## 📊 功能對應關係

| 需求 | 實現位置 | 說明 |
|------|----------|------|
| 基礎聊天機器人 | `chat_interface.py` | 實時對話、訊息渲染 |
| 會話歷史 | `session_manager.py` | CRUD 操作、列表管理 |
| 狀態記錄 | `sidebar.py`, `session_manager.py` | 狀態更新和追蹤 |
| Checkpoint 整合 | `checkpoint_service.py` | PostgreSQL 查詢 |

## 🔐 安全考慮

1. **測試模式**: 默認使用 `/process_test` 端點,不發送到 Jira
2. **環境變數**: 敏感信息不提交到代碼庫
3. **唯讀訪問**: Checkpoint 服務僅讀取,不修改工作流狀態
4. **本地存儲**: 會話數據存儲在本地,不上傳

## 🐛 故障排查

### 常見問題

1. **後端連接失敗**
   - 確認後端服務運行: `curl http://localhost:3000/api/jira/health`
   - 檢查 `.env` 中的 `BACKEND_API_URL`

2. **資料庫連接失敗**
   - 確認 PostgreSQL 運行: `docker ps | grep postgres`
   - 檢查 `.env` 中的 `DATABASE_URL`

3. **uv 依賴問題**
   - 刪除 `.venv` 和 `uv.lock`
   - 重新運行 `uv sync`

## 📚 相關文檔

- **客戶端 README**: [streamlit_client/README.md](streamlit_client/README.md)
- **快速開始**: [streamlit_client/QUICKSTART.md](streamlit_client/QUICKSTART.md)
- **後端文檔**: [CLAUDE.md](CLAUDE.md)
- **LangMem 指南**: [LANGMEM_GUIDE.md](LANGMEM_GUIDE.md)

## 🔄 與現有系統的關係

### 數據流

```
Streamlit UI
    ↕️ (HTTP)
Jira CS Server API
    ↕️
LangGraph Orchestrator
    ↕️
LangGraph Workflow
    ↕️
PostgreSQL (LangMem)
```

### 獨立性

- **獨立運行**: 客戶端可單獨部署
- **無侵入性**: 不修改後端代碼
- **可選組件**: 不影響原有 Jira 整合方式

### 互補性

- **原方式**: Jira → Webhook → API → 自動回復
- **新方式**: Streamlit → API → 測試模式(不發送)
- **共享**: 同一個 PostgreSQL checkpoint 資料庫

## 📝 開發指南

### 添加新功能

1. **新 UI 組件**: 在 `components/` 中創建
2. **新服務**: 在 `services/` 中實現
3. **新配置**: 在 `config/settings.py` 中添加

### 代碼規範

- 使用 Black 格式化: `uv run black .`
- 使用 Ruff 檢查: `uv run ruff check .`
- 遵循 Python 類型提示

### 測試

```bash
# 運行測試
uv run pytest

# 代碼覆蓋率
uv run pytest --cov
```

## 🎉 總結

Streamlit 客戶端提供了一個完整的 Web UI 來與 Jira CS Server 交互,實現了:

✅ **基礎聊天機器人功能**
✅ **會話歷史管理**
✅ **問題狀態記錄**
✅ **LangMem Checkpoint 整合**

所有功能都無縫整合現有的後端服務,不需要修改任何後端代碼。

---

**版本**: 1.0.0
**最後更新**: 2025-10-26
**維護者**: ALVIS.MC.TSAO
