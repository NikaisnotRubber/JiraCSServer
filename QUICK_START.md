# 🚀 快速開始指南

## 5 分鐘啟動 JiraCSServer v2.0

### 前置檢查

確認您已安裝：
- ✅ Node.js >= 18.0.0
- ✅ pnpm >= 9.0.0

```bash
# 檢查版本
node --version    # 應該 >= v18.0.0
pnpm --version    # 應該 >= 9.0.0
```

如果沒有安裝 pnpm：
```bash
npm install -g pnpm
```

---

## 步驟 1: 安裝依賴（1 分鐘）

```bash
cd /Users/csffee996/JiraCSServer
pnpm install
```

---

## 步驟 2: 配置環境（2 分鐘）

```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 文件
nano .env
```

**最少需要配置：**

```env
# OpenAI API Key（必需）
OPENAI_API_KEY=sk-your-api-key-here

# Jira 配置（必需）
JIRA_BASE_URL=https://your-jira-instance.com
JIRA_AUTH_TOKEN=your_base64_auth_token

# 其他使用默認值即可
NODE_ENV=development
PORT=3000
```

### 如何獲取 JIRA_AUTH_TOKEN？

```bash
# 格式：username:password 轉 base64
echo -n "username:password" | base64
```

---

## 步驟 3: 啟動開發服務器（30 秒）

```bash
# 啟動 Next.js 開發服務器
pnpm dev
```

**成功啟動會看到：**
```
  ▲ Next.js 15.0.4
  - Local:        http://localhost:3000
  - Ready in 2.5s
```

---

## 步驟 4: 測試 API（1.5 分鐘）

### 測試 1: 健康檢查

```bash
curl http://localhost:3000/api/jira/health
```

**預期響應：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-10-13T..."
  }
}
```

### 測試 2: 系統信息

```bash
curl http://localhost:3000/api/jira/info
```

### 測試 3: 處理工單

創建測試文件 `test-issue.json`：

```json
{
  "forms": {
    "Project ID": "TEST-001",
    "Issue Type": "Support Request",
    "Reporter": "test.user",
    "Created": "2025/10/13 10:00",
    "Updated": "2025/10/13 10:00",
    "Summary": "測試登入問題",
    "Space Type": "jira",
    "Request Type": "login",
    "Is Batch Request": false,
    "Anonymous Submission": false,
    "Comment": {
      "Created": "2025/10/13 10:00",
      "Updated": "2025/10/13 10:00",
      "Content": "我無法登入系統，一直顯示密碼錯誤"
    }
  }
}
```

```bash
curl -X POST http://localhost:3000/api/jira/process \
  -H "Content-Type: application/json" \
  -d @test-issue.json
```

### 測試 4: 後續處理 ⭐ 新功能

```bash
curl -X POST http://localhost:3000/api/jira/postProcess \
  -H "Content-Type: application/json" \
  -d '{
    "original_issue_key": "TEST-001",
    "workflow_id": "test-workflow-001",
    "follow_up_content": "我試過重置密碼了，但還是不行",
    "user": "test.user",
    "timestamp": "2025-10-13T10:30:00Z"
  }'
```

---

## ✅ 完成！

如果所有測試都通過，您已經成功啟動 JiraCSServer v2.0！

---

## 🎯 下一步

### 1. 探索所有端點

```bash
# 查看所有可用端點
curl http://localhost:3000
```

### 2. 測試不同的請求類型

嘗試不同的 `Request Type`：
- `new_account` - 新賬號（僅 confluence/ext）
- `login` - 登入問題
- `permission` - 權限問題
- `field_setup` - 欄位設置（僅 jira）
- `workflow` - 工作流程（僅 jira）
- `new_space` - 新空間
- `consultation` - 咨詢
- `wish_pool` - 許願池
- `other` - 其他

### 3. 測試批量處理

```bash
curl -X POST http://localhost:3000/api/jira/batch \
  -H "Content-Type: application/json" \
  -d '{
    "issues": [
      { /* issue 1 */ },
      { /* issue 2 */ }
    ],
    "options": {
      "parallel": true
    }
  }'
```

---

## 🛠️ 開發工具

### 查看日誌

開發服務器會實時顯示：
- 📥 進來的請求
- 🔄 處理過程
- ✅ 成功響應
- ❌ 錯誤信息

### TypeScript 類型檢查

```bash
pnpm run type-check
```

### 運行測試

```bash
# 基本測試
pnpm test

# 模擬模式（不調用真實 API）
pnpm run test:mock

# API 測試
pnpm run test:api
```

---

## 📚 更多資源

- 📖 [完整文檔](./README_V2.md)
- 🔄 [遷移指南](./MIGRATION_GUIDE.md)
- 📝 [API 文檔](./API.md)
- 🚀 [部署指南](./DEPLOYMENT.md)
- 📋 [變更日誌](./CHANGELOG_V2.md)

---

## ❓ 常見問題

### Q: pnpm install 很慢？

```bash
# 使用淘寶鏡像
pnpm config set registry https://registry.npmmirror.com
pnpm install
```

### Q: OpenAI API 調用失敗？

檢查：
1. `OPENAI_API_KEY` 是否正確
2. API key 是否有餘額
3. 網絡是否能訪問 OpenAI API

### Q: 端口 3000 已被占用？

```bash
# 方法 1: 修改端口
# 在 .env 中設置
PORT=3001

# 方法 2: 殺死占用進程
lsof -ti:3000 | xargs kill -9
```

### Q: TypeScript 錯誤？

```bash
# 清除緩存並重建
rm -rf .next dist node_modules/.cache
pnpm install
pnpm dev
```

---

## 🆘 需要幫助？

如果遇到問題：

1. 查看 [故障排除](./MIGRATION_GUIDE.md#故障排除)
2. 檢查 [GitHub Issues](https://github.com/your-org/JiraCSServer/issues)
3. 查看控制台日誌

---

## 📊 系統狀態檢查清單

使用這個清單確認系統正常運行：

- [ ] pnpm 已安裝
- [ ] 依賴安裝成功
- [ ] .env 配置完成
- [ ] 開發服務器啟動
- [ ] 健康檢查通過
- [ ] 單一工單處理測試通過
- [ ] 後續處理測試通過
- [ ] TypeScript 類型檢查通過

**全部勾選？恭喜！🎉 您已成功啟動 JiraCSServer v2.0！**

---

**版本:** 2.0.0
**最後更新:** 2025-10-13
