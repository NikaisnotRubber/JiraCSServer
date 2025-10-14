# 測試指南

## 測試數據包說明

### 📦 測試文件列表

| 文件 | 描述 | Space Type | Request Type |
|------|------|------------|--------------|
| `01-single-login-issue.json` | 登入問題 | jira | login |
| `02-permission-request.json` | 權限請求 | confluence | permission |
| `03-field-setup-jira.json` | 欄位設置（Jira 專屬） | jira | field_setup |
| `04-new-account-confluence.json` | 新帳號申請（Confluence 專屬） | confluence | new_account |
| `05-wish-pool.json` | 許願池功能請求 | jira | wish_pool |
| `06-anonymous-submission.json` | 匿名咨詢 | corp | consultation |
| `07-batch-request.json` | 批量處理（3個工單） | mixed | mixed |
| `08-post-process.json` | 後續追問 | - | - |

## 🚀 快速測試

### 方法 1: 使用 Bash 腳本（推薦）

```bash
# 1. 給腳本執行權限
chmod +x test-all-endpoints.sh

# 2. 確保服務器運行中
pnpm dev
# 或
pnpm start

# 3. 在新終端執行測試
./test-all-endpoints.sh
```

### 方法 2: 使用 Python 腳本

```bash
# 1. 確保服務器運行中
pnpm dev

# 2. 在新終端執行測試
python3 test-endpoints.py
```

### 方法 3: 手動使用 curl

#### 測試健康檢查
```bash
curl http://localhost:3000/api/jira/health | jq '.'
```

#### 測試單一工單處理
```bash
curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d @test-payloads/01-single-login-issue.json \
  | jq '.'
```

#### 測試後續處理
```bash
curl -X POST http://localhost:3000/api/jira/postProcess \
  -H "Content-Type: application/json" \
  -d @test-payloads/08-post-process.json \
  | jq '.'
```

#### 測試批量處理
```bash
curl -X POST http://localhost:3000/api/jira/batch \
  -H "Content-Type: application/json" \
  -d @test-payloads/07-batch-request.json \
  | jq '.'
```

## 📊 測試結果

測試結果會保存在 `test-results/` 目錄中：

```bash
# 查看所有結果
ls -lh test-results/

# 查看特定結果（格式化）
cat test-results/單一工單_-_登入問題.json | jq '.'

# 查看測試總結
cat test-results/_test_summary.json | jq '.'
```

## 🎯 端點測試清單

### ✅ GET 端點

- [ ] `GET /` - API 文檔
- [ ] `GET /api/jira/health` - 健康檢查
- [ ] `GET /api/jira/info` - 系統信息
- [ ] `GET /api/jira/postProcess` - postProcess 端點信息
- [ ] `GET /api/jira/status/:workflowId` - 工作流狀態

### ✅ POST 端點

- [ ] `POST /api/jira/process` - 單一工單處理
  - [ ] 登入問題 (jira/login)
  - [ ] 權限請求 (confluence/permission)
  - [ ] 欄位設置 (jira/field_setup) - Jira 專屬
  - [ ] 新帳號申請 (confluence/new_account) - Confluence 專屬
  - [ ] 許願池 (jira/wish_pool)
  - [ ] 匿名提交 (corp/consultation)
- [ ] `POST /api/jira/batch` - 批量處理
- [ ] `POST /api/jira/postProcess` - 後續處理（追問）

## 📝 自定義測試數據

### 創建新的測試數據

```json
{
  "forms": {
    "Project ID": "YOUR-PROJECT-ID",
    "Issue Type": "Support Request",
    "Reporter": "your.username",
    "Created": "2025/10/13 10:00",
    "Updated": "2025/10/13 10:00",
    "Summary": "問題摘要",
    "Space Type": "jira",  // 可選: jira, confluence, corp, ext
    "Request Type": "login",  // 參考下方請求類型
    "Is Batch Request": false,
    "Anonymous Submission": false,
    "Comment": {
      "Created": "2025/10/13 10:00",
      "Updated": "2025/10/13 10:00",
      "Content": "詳細問題描述..."
    },
    "metadata": {
      "department": "IT",
      "priority": "high",
      "tags": ["tag1", "tag2"]
    }
  }
}
```

### 請求類型參考

| Request Type | 中文名稱 | 可用空間 |
|--------------|----------|----------|
| `new_account` | 新賬號授權 | confluence, ext |
| `login` | 登入 | 所有 |
| `permission` | 權限 | 所有 |
| `field_setup` | 欄位設置 | jira |
| `workflow` | 工作流程 | jira |
| `new_space` | 新空間申請 | 所有 |
| `consultation` | 咨詢 | 所有 |
| `wish_pool` | 許願池 | 所有 |
| `other` | 其他 | 所有 |

## 🔍 測試預期結果

### 成功響應範例

```json
{
  "success": true,
  "data": {
    "issue_key": "JCSC-2025-001",
    "Source": "您好，我今天早上嘗試登入公司的 J...",
    "comment_content": "您好！關於您的登入問題...",
    "workflow_id": "abc-123-def-456",
    "processing_time": 2345,
    "classification": {
      "category": "JIRA_SIMPLE",
      "confidence": 0.95
    },
    "quality_score": 92
  },
  "timestamp": "2025-10-13T14:35:00Z"
}
```

### 失敗響應範例

```json
{
  "success": false,
  "error": "Invalid input",
  "details": "Required field 'Space Type' is missing",
  "timestamp": "2025-10-13T14:35:00Z"
}
```

## 🐛 故障排除

### 問題 1: 連接錯誤

```bash
curl: (7) Failed to connect to localhost port 3000
```

**解決方案：**
- 確認服務器正在運行：`pnpm dev`
- 檢查端口是否正確：`lsof -ti:3000`

### 問題 2: JSON 解析錯誤

```bash
curl: (3) URL using bad/illegal format or missing URL
```

**解決方案：**
- 確認 JSON 文件格式正確
- 使用 `jq` 驗證：`cat test-payloads/01-single-login-issue.json | jq '.'`

### 問題 3: 401/403 錯誤

**解決方案：**
- 檢查環境變數配置
- 確認 JIRA_AUTH_TOKEN 有效

### 問題 4: 超時錯誤

**解決方案：**
- 檢查 OpenAI API Key 是否有效
- 檢查網絡連接
- 查看服務器日誌

## 📈 性能測試

### 測試處理時間

```bash
# 單一工單
time curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d @test-payloads/01-single-login-issue.json

# 批量工單（並行）
time curl -X POST http://localhost:3000/api/jira/batch \
  -H "Content-Type: application/json" \
  -d @test-payloads/07-batch-request.json
```

### 預期性能指標

- 單一工單處理：< 5s
- 批量處理（並行）：< 10s
- 後續處理：< 3s
- 健康檢查：< 100ms

## 🧪 進階測試

### 壓力測試

```bash
# 使用 Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/jira/health

# 使用 wrk
wrk -t4 -c100 -d30s http://localhost:3000/api/jira/health
```

### 並發測試

```bash
# 同時發送多個請求
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/jira/process \
    -H "Content-Type: application/json" \
    -d @test-payloads/01-single-login-issue.json &
done
wait
```

## 📚 相關文檔

- [API 文檔](./API.md)
- [README](./README_V2.md)
- [快速開始](./QUICK_START.md)

---

**版本:** 2.0.0
**最後更新:** 2025-10-13
