# 🚀 快速測試指南

## 5 分鐘測試 JiraCSServer v2.0

### 準備工作

**終端 1 - 啟動服務器：**
```bash
cd /Users/csffee996/JiraCSServer
pnpm dev
```

等待看到：
```
✓ Ready in 2.5s
○ Local: http://localhost:3000
```

---

## 🎯 測試方案

### 方案 A: 自動化測試（推薦）

**終端 2 - 運行所有測試：**

```bash
# 方法 1: Bash 腳本
./test-all-endpoints.sh

# 方法 2: Python 腳本
python3 test-endpoints.py
```

結果會保存在 `test-results/` 目錄。

---

### 方案 B: 手動測試

#### 1️⃣ 測試健康檢查（10 秒）

```bash
curl http://localhost:3000/api/jira/health
```

**預期輸出：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "JiraCSServer",
    "timestamp": "2025-10-13T..."
  }
}
```

---

#### 2️⃣ 測試單一工單 - 登入問題（30 秒）

```bash
curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d '{
    "forms": {
      "Project ID": "JCSC-TEST-001",
      "Issue Type": "Support Request",
      "Reporter": "test.user",
      "Created": "2025/10/13 14:30",
      "Updated": "2025/10/13 14:30",
      "Summary": "無法登入系統",
      "Space Type": "jira",
      "Request Type": "login",
      "Is Batch Request": false,
      "Anonymous Submission": false,
      "Comment": {
        "Created": "2025/10/13 14:30",
        "Updated": "2025/10/13 14:30",
        "Content": "我嘗試登入但顯示密碼錯誤"
      }
    }
  }'
```

**預期輸出：**
```json
{
  "success": true,
  "data": {
    "issue_key": "JCSC-TEST-001",
    "Source": "我嘗試登入但顯示密碼錯...",
    "comment_content": "您好！關於您的登入問題...",
    "workflow_id": "...",
    "processing_time": 2345,
    "classification": {
      "category": "JIRA_SIMPLE",
      "confidence": 0.95
    }
  }
}
```

---

#### 3️⃣ 測試後續處理 - 追問（30 秒）⭐ 新功能

```bash
curl -X POST http://localhost:3000/api/jira/postProcess \
  -H "Content-Type: application/json" \
  -d '{
    "original_issue_key": "JCSC-TEST-001",
    "workflow_id": "test-001",
    "follow_up_content": "我試過重置密碼了，但還是不行",
    "user": "test.user",
    "timestamp": "2025-10-13T15:00:00Z"
  }'
```

**預期輸出：**
```json
{
  "success": true,
  "data": {
    "original_issue_key": "JCSC-TEST-001",
    "workflow_id": "test-001",
    "response": "了解您已嘗試重置密碼...",
    "confidence": 0.89,
    "suggested_action": "provide_answer",
    "processing_time": 1234
  }
}
```

---

#### 4️⃣ 測試批量處理（60 秒）

```bash
curl -X POST http://localhost:3000/api/jira/batch \
  -H "Content-Type: application/json" \
  -d @test-payloads/07-batch-request.json
```

---

#### 5️⃣ 測試不同空間和請求類型

**A. Jira 專屬 - 欄位設置：**
```bash
curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d @test-payloads/03-field-setup-jira.json
```

**B. Confluence 專屬 - 新帳號：**
```bash
curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d @test-payloads/04-new-account-confluence.json
```

**C. 許願池：**
```bash
curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d @test-payloads/05-wish-pool.json
```

**D. 匿名提交：**
```bash
curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d @test-payloads/06-anonymous-submission.json
```

---

## 📊 查看測試結果

### 使用 jq 格式化（推薦）

```bash
# 安裝 jq（如果沒有）
brew install jq

# 格式化查看
curl http://localhost:3000/api/jira/health | jq '.'
```

### 保存結果到文件

```bash
# 保存健康檢查結果
curl http://localhost:3000/api/jira/health > health-check.json

# 保存並格式化
curl http://localhost:3000/api/jira/health | jq '.' > health-check-formatted.json
```

---

## ✅ 測試清單

快速驗證所有功能是否正常：

- [ ] 服務器啟動成功
- [ ] 健康檢查返回 200
- [ ] 單一工單處理成功（登入問題）
- [ ] 後續處理（追問）成功 ⭐
- [ ] 批量處理成功
- [ ] Jira 專屬功能測試（field_setup）
- [ ] Confluence 專屬功能測試（new_account）
- [ ] 許願池功能測試
- [ ] 匿名提交測試

---

## 🎨 使用 Postman/Insomnia

### 導入到 Postman

1. 打開 Postman
2. 點擊 Import
3. 選擇 Raw Text
4. 粘貼任何測試 JSON
5. 設置 URL: `http://localhost:3000/api/jira/process`
6. 方法: POST
7. Headers: `Content-Type: application/json`
8. 點擊 Send

---

## 🐛 故障排除

### 連接失敗
```
curl: (7) Failed to connect to localhost port 3000
```
➡️ 確認服務器正在運行：`pnpm dev`

### OpenAI API 錯誤
```
Error: Invalid API key
```
➡️ 檢查 `.env` 文件中的 `OPENAI_API_KEY`

### 模組錯誤
```
Cannot find module...
```
➡️ 重新安裝依賴：`pnpm install`

---

## 📈 性能基準

| 操作 | 預期時間 |
|------|----------|
| 健康檢查 | < 100ms |
| 單一工單 | < 5s |
| 後續處理 | < 3s |
| 批量處理（3個） | < 10s |

---

## 🎉 成功！

如果所有測試都通過，您已經成功運行 JiraCSServer v2.0！

### 下一步：
- 查看 [完整測試指南](./TEST_GUIDE.md)
- 閱讀 [API 文檔](./API.md)
- 探索 [README](./README_V2.md)

---

**版本:** 2.0.0
**測試時間:** ~5 分鐘
