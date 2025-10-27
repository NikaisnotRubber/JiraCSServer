# Jira CS Assistant - Streamlit 客戶端

基於 Streamlit 的 AI 聊天機器人客戶端,整合後端 Jira CS Server 服務,提供智能客服功能。

## 🎯 功能特性

### 核心功能

1. **基礎聊天機器人** - 與 AI 進行自然對話,獲取 Jira 使用幫助
2. **會話歷史管理** - 查看、恢復、刪除歷史對話
3. **問題狀態追蹤** - 追蹤問題狀態(open/pending/closed)
4. **LangMem 整合** - 自動上下文持久化,跨會話記憶

### 系統整合

- **後端 API**: 與 Jira CS Server 完美整合
- **LangMem Checkpoint**: 直接訪問 PostgreSQL checkpoint 表
- **自動上下文**: 基於 Project ID 的會話上下文自動加載

## 🚀 快速開始

### 前置要求

- **Python**: >= 3.10
- **uv**: 已安裝 `uv` 包管理器
- **後端服務**: Jira CS Server 運行在 `http://localhost:3000`
- **PostgreSQL**: 資料庫運行在 `localhost:5432`

### 安裝步驟

1. **進入客戶端目錄**:
   ```bash
   cd /Users/csffee996/.gemini/JiraCSServer/streamlit_client
   ```

2. **使用 uv 創建虛擬環境並安裝依賴**:
   ```bash
   # 初始化 uv 項目(如果還沒初始化)
   uv init

   # 同步依賴
   uv sync
   ```

3. **配置環境變數**:
   ```bash
   # 複製環境變數模板
   cp .env.example .env

   # 編輯 .env 文件
   nano .env
   ```

   **必需配置**:
   ```bash
   BACKEND_API_URL=http://localhost:3000
   DATABASE_URL=postgresql://postgres:password@localhost:5432/jira_cs
   ```

4. **啟動 Streamlit 應用**:
   ```bash
   # 使用 uv 運行
   uv run streamlit run app.py

   # 或激活虛擬環境後運行
   source .venv/bin/activate  # Linux/Mac
   # 或 .venv\Scripts\activate  # Windows
   streamlit run app.py
   ```

5. **訪問應用**:
   - 打開瀏覽器訪問: `http://localhost:8501`

## 📁 項目結構

```
streamlit_client/
├── app.py                    # 主程序入口
├── pyproject.toml            # uv 項目配置
├── .python-version           # Python 版本指定
├── .env.example              # 環境變數模板
├── .env                      # 環境變數(不提交)
├── README.md                 # 本文件
├── config/                   # 配置模組
│   ├── __init__.py
│   └── settings.py           # 全局設定
├── services/                 # 服務層
│   ├── __init__.py
│   ├── api_client.py         # 後端 API 客戶端
│   ├── session_manager.py    # 會話管理
│   └── checkpoint_service.py # Checkpoint 服務
├── components/               # UI 組件
│   ├── __init__.py
│   ├── chat_interface.py     # 聊天界面
│   └── sidebar.py            # 側邊欄
├── utils/                    # 工具函數
│   └── __init__.py
└── data/                     # 數據存儲
    └── sessions/             # 會話文件存儲
```

## 🔧 使用指南

### 創建新會話

1. 在左側邊欄中找到 **"➕ 創建新會話"**
2. 輸入 **Project ID**(例如: `JCSC-1`)
3. (可選)輸入會話標題和選擇初始狀態
4. 點擊 **"創建會話"** 按鈕

### 開始對話

1. 確保已選擇或創建一個會話
2. 在底部聊天輸入框中輸入問題
3. 按 `Enter` 發送
4. AI 將自動處理並回應

### 查看歷史會話

1. 在側邊欄 **"📚 會話歷史"** 中查看所有會話
2. 使用狀態篩選器過濾會話
3. 點擊會話標題加載該會話
4. 點擊 🗑️ 刪除不需要的會話

### 管理會話狀態

1. 在側邊欄 **"⚙️ 會話操作"** 中
2. 選擇新狀態(open/pending/closed)
3. 點擊 **"💾 保存狀態"**

### LangMem 上下文

- **自動加載**: 使用相同 Project ID 的會話會自動加載歷史上下文
- **Checkpoint 顯示**: 側邊欄顯示當前會話的 checkpoint 數量和狀態
- **無需手動配置**: 上下文持久化完全自動化

## 🔌 API 整合

### 後端端點

客戶端調用以下後端 API:

- **POST /api/jira/process_test** - 處理用戶問題(測試模式,不發送到 Jira)
- **GET /api/jira/health** - 系統健康檢查
- **GET /api/jira/info** - 系統信息

### 請求格式

```python
{
  "forms": {
    "Project ID": "JCSC-1",
    "Issue Type": "Question",
    "Reporter": "Streamlit User",
    "Summary": "用戶問題摘要",
    "Comment": {
      "Content": "完整的用戶問題內容",
      "Author": "Streamlit User"
    }
  }
}
```

### 響應格式

```python
{
  "success": true,
  "data": {
    "comment_content": "AI 回答內容",
    "classification": {
      "category": "login_issue",
      "confidence": 0.95
    },
    "quality_score": 0.88,
    "processing_time": 1234,
    "workflow_id": "uuid-here"
  }
}
```

## 🗄️ 資料庫整合

### Session 存儲

- **位置**: `./data/sessions/` (可配置)
- **格式**: JSON 文件
- **命名**: `{project_id}.json`

### Checkpoint 訪問

直接訪問 PostgreSQL 中的 LangGraph checkpoint 表:

- **checkpoints** - 會話 checkpoint 主表
- **checkpoint_writes** - Checkpoint 寫入記錄
- **checkpoint_blobs** - Checkpoint 二進制數據

## 📊 系統監控

### 側邊欄狀態面板

- **後端服務狀態**: 實時健康檢查
- **資料庫連接**: PostgreSQL 連接狀態
- **Checkpoint 統計**: 總會話數、總 checkpoints 等

### 訊息元數據

每條 AI 回應都包含詳細元數據:

- **分類**: 問題類型和信心度
- **質量評分**: 回應質量評估
- **處理時間**: 後端處理耗時
- **工作流 ID**: 唯一的工作流追蹤 ID

## ⚙️ 配置選項

### 環境變數(`.env`)

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

### UI 配置(`config/settings.py`)

```python
# 頁面標題和圖標
page_title = "Jira CS Assistant"
page_icon = "🤖"

# 會話狀態選項
status_options = ["open", "pending", "closed"]

# 最大歷史顯示數量
max_history_display = 50
```

## 🧪 開發與測試

### 安裝開發依賴

```bash
uv sync --dev
```

### 代碼格式化

```bash
# 使用 Black
uv run black .

# 使用 Ruff
uv run ruff check .
```

### 運行測試

```bash
uv run pytest
```

## 🐛 故障排查

### 無法連接後端

**症狀**: `❌ 後端服務異常`

**解決方案**:
1. 確認後端服務正在運行: `curl http://localhost:3000/api/jira/health`
2. 檢查 `.env` 中的 `BACKEND_API_URL`
3. 查看後端服務日誌

### 資料庫連接失敗

**症狀**: `⚠️ 資料庫連接失敗`

**解決方案**:
1. 確認 PostgreSQL 正在運行: `docker ps | grep postgres`
2. 檢查 `.env` 中的 `DATABASE_URL`
3. 測試連接: `psql $DATABASE_URL -c "SELECT 1"`

### 會話無法保存

**症狀**: 會話數據丟失

**解決方案**:
1. 檢查 `SESSION_STORAGE_PATH` 目錄是否存在
2. 確認有寫入權限: `ls -la ./data/sessions/`
3. 查看應用日誌

### LangMem 上下文未加載

**症狀**: `📚 LangMem 上下文: ❌ 無`

**這是正常的!** 表示這是該 Project ID 的首次互動。再次使用相同 Project ID 就會自動加載上下文。

## 📚 相關文檔

- **後端文檔**: [../CLAUDE.md](../CLAUDE.md)
- **LangMem 指南**: [../LANGMEM_GUIDE.md](../LANGMEM_GUIDE.md)
- **上下文系統**: [../CONTEXT_STORAGE.md](../CONTEXT_STORAGE.md)

## 🔒 安全注意事項

1. **不要提交 `.env` 文件** - 包含敏感信息
2. **使用測試端點** - 默認使用 `/process_test` 不發送到 Jira
3. **資料庫訪問** - 僅讀取 checkpoint,不修改工作流狀態

## 📝 版本歷史

- **v1.0.0** (2025-10-26)
  - 初始版本
  - 基礎聊天機器人功能
  - 會話管理
  - 狀態追蹤
  - LangMem 整合

## 📞 支援

如有問題或建議,請聯繫項目維護者或提交 Issue。

---

**維護者**: ALVIS.MC.TSAO
**最後更新**: 2025-10-26
**版本**: 1.0.0
