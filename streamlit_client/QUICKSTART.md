# Streamlit 客戶端快速開始指南

## 🚀 5 分鐘快速啟動

### 步驟 1: 確認後端服務運行

```bash
# 在 WSL 或主項目目錄中
cd /Users/csffee996/.gemini/JiraCSServer

# 啟動後端服務(如果還沒啟動)
npm run server:dev

# 或
npm run dev
```

### 步驟 2: 進入客戶端目錄

```bash
cd streamlit_client
```

### 步驟 3: 安裝依賴(使用 uv)

```bash
# 初始化項目(首次運行)
uv init

# 同步依賴
uv sync
```

### 步驟 4: 配置環境變數

```bash
# 複製環境變數模板
cp .env.example .env

# 編輯 .env(如果需要修改默認值)
nano .env
```

**默認配置**:
```bash
BACKEND_API_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/jira_cs
```

### 步驟 5: 啟動 Streamlit

```bash
# 使用 uv 運行
uv run streamlit run app.py
```

### 步驟 6: 訪問應用

打開瀏覽器訪問: **http://localhost:8501**

---

## 📝 第一次使用

### 創建第一個會話

1. 在左側邊欄找到 **"➕ 創建新會話"**
2. 輸入 Project ID: `JCSC-TEST-1`
3. 輸入標題: `測試對話`
4. 點擊 **"創建會話"**

### 發送第一條訊息

1. 在底部輸入框輸入: `如何重置 Jira 密碼?`
2. 按 `Enter` 發送
3. 等待 AI 回應(約 2-5 秒)

### 查看詳細信息

點擊 AI 回應下方的 **"📊 詳細信息"** 查看:
- 問題分類
- 信心度
- 質量評分
- 處理時間

---

## 🔧 常用操作

### 切換會話

1. 在側邊欄 **"📚 會話歷史"** 中
2. 點擊任意會話標題
3. 會話內容自動加載

### 更改會話狀態

1. 在側邊欄 **"⚙️ 會話操作"** 中
2. 選擇新狀態(pending/closed)
3. 點擊 **"💾 保存狀態"**

### 測試上下文記憶

1. 創建會話 `JCSC-TEST-2`
2. 詢問: `如何創建新項目?`
3. 等待回應後,再詢問: `那權限怎麼設置?`
4. AI 會記住上一個問題的上下文(創建項目)

### 查看系統狀態

側邊欄頂部 **"🖥️ 系統狀態"** 顯示:
- ✅ 後端服務正常
- ✅ 資料庫連接正常
- Checkpoint 統計信息

---

## 🎯 功能演示

### Demo 1: 基礎問答

```
用戶: 如何登入 Jira?
AI: [提供詳細的登入步驟和故障排除建議]
```

### Demo 2: 上下文追問

```
用戶: 我忘記密碼了
AI: [提供密碼重置步驟]

用戶: 重置連結收不到怎麼辦?
AI: [基於前一個問題的上下文,提供解決方案]
```

### Demo 3: 複雜問題

```
用戶: 我想設置工作流程審批,需要特定人員審核才能關閉 issue
AI: [分析為複雜問題,提供詳細的工作流程配置指南]
```

---

## 🐛 遇到問題?

### 後端連接失敗

```
❌ 後端服務異常: 無法連接到後端服務器
```

**解決方案**:
```bash
# 檢查後端是否運行
curl http://localhost:3000/api/jira/health

# 如果沒有運行,啟動後端
cd /Users/csffee996/.gemini/JiraCSServer
npm run server:dev
```

### 資料庫連接失敗

```
⚠️ 資料庫連接失敗
```

**解決方案**:
```bash
# 檢查 PostgreSQL 是否運行
docker ps | grep postgres

# 如果沒有運行,啟動 PostgreSQL
docker start jira-cs-postgres

# 或重新創建
docker run --name jira-cs-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=jira_cs \
  -p 5432:5432 \
  -d postgres:16
```

### 訊息發送後無響應

1. 檢查後端日誌是否有錯誤
2. 確認 OpenAI API Key 已設置
3. 查看 Streamlit 終端是否有異常

---

## 📚 下一步

- 閱讀完整文檔: [README.md](README.md)
- 了解系統架構: [../CLAUDE.md](../CLAUDE.md)
- 學習 LangMem: [../LANGMEM_GUIDE.md](../LANGMEM_GUIDE.md)

---

**祝你使用愉快!** 🎉
