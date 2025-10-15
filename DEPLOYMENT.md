好的，這份是您提供的 `JiraCSServer 部署指南` 的繁體中文版本：

# JiraCSServer 部署指南

## 📋 目錄

  - [前置要求](https://www.google.com/search?q=%23%E5%89%8D%E7%BD%AE%E8%A6%81%E6%B1%82)
  - [本地開發](https://www.google.com/search?q=%23%E6%9C%AC%E5%9C%B0%E9%96%8B%E7%99%BC)
  - [Docker 部署](https://www.google.com/search?q=%23docker-%E9%83%A8%E7%BD%B2)
  - [生產環境部署](https://www.google.com/search?q=%23%E7%94%9F%E7%94%A2%E7%92%B0%E5%A2%83%E9%83%A8%E7%BD%B2)
  - [故障排除](https://www.google.com/search?q=%23%E6%95%85%E9%9A%9C%E6%8E%92%E9%99%A4)

## 前置要求

### 軟體要求

  - Docker \>= 20.10
  - Docker Compose \>= 2.0
  - Node.js \>= 20 (本地開發)
  - pnpm \>= 9.0 (本地開發)

### 環境變數

確保 `.env` 檔案已正確設定：

```bash
# OpenAI 設定
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gemini-flash-latest
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

# Jira 設定
JIRA_BASE_URL=https://jirastage.deltaww.com
JIRA_AUTH_TOKEN=YWx2aXMuYWRtaW46UGFyYTk0Nzg=

# 應用程式設定
NODE_ENV=production
TEST_MODE=false
PORT=3000
```

## 本地開發

### 1\. 安裝依賴

```bash
pnpm install
```

### 2\. 啟動開發伺服器

```bash
pnpm dev
```

伺服器將在 `http://localhost:3000` 啟動

### 3\. 測試 API

```bash
# 健康檢查
curl http://localhost:3000/health

# 測試處理端點（不傳送到 Jira）
curl -X POST http://localhost:3000/api/jira/process_test \
  -H "Content-Type: application/json" \
  -d @test-data.json
```

## Docker 部署

### 快速啟動

```bash
# 建置並啟動所有服務
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down

# 匯出 Image 打包壓縮檔
docker save -o jiracsserver-images.tar jiracsserver-jira-cs-server:latest nginx:alpine
```

### 打包文件部署
```bash
# 加載
docker load -i jiracsserver-images.tar

# 啓動
docker-compose up -d 
```
### 服務存取

啟動後，服務可透過以下連接埠存取：

  - **連接埠 80**: `http://your-server-ip/api/jira/process`
  - **連接埠 8080**: `http://your-server-ip:8080/api/jira/process`
  - **連接埠 3000**: 直接存取 Next.js 應用程式（僅用於偵錯）

### 架構說明

```
┌─────────────┐
│   用戶端    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Nginx (連接埠 80/8080)             │
│   - 反向代理                         │
│   - 負載平衡                         │
│   - 日誌記錄                         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   JiraCSServer (連接埠 3000)         │
│   - Next.js 應用程式                 │
│   - API 路由處理                     │
│   - LangGraph 工作流程               │
└─────────────────────────────────────┘
```

## 生產環境部署

### 方法 1: 使用 Docker Compose（推薦）

```bash
# 1. 複製程式碼到伺服器
git clone <your-repo> /opt/jira-cs-server
cd /opt/jira-cs-server

# 2. 設定環境變數
cp .env.example .env
vim .env  # 編輯設定

# 3. 建置並啟動
docker-compose up -d --build

# 4. 查看服務狀態
docker-compose ps

# 5. 查看日誌
docker-compose logs -f jira-cs-server
docker-compose logs -f nginx
```

### 方法 2: 使用現有 Nginx

如果您的伺服器已有 Nginx，可以只執行應用程式容器：

```bash
# 1. 只啟動應用程式服務
docker-compose up -d jira-cs-server

# 2. 設定現有 Nginx
# 將 nginx/conf.d/jira-cs-server.conf 的內容新增至您的 Nginx 設定
# 注意修改 upstream 為: localhost:3000
```

### 方法 3: 獨立 Docker 執行

```bash
# 建置映像檔
docker build -t jira-cs-server:latest .

# 執行容器
docker run -d \
  --name jira-cs-server \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  jira-cs-server:latest

# 設定 Nginx 反向代理到 localhost:3000
```

## 服務管理

### 查看服務狀態

```bash
# Docker Compose
docker-compose ps

# 健康檢查
curl http://localhost/health
curl http://localhost:8080/health
```

### 查看日誌

```bash
# 應用程式日誌
docker-compose logs -f jira-cs-server

# Nginx 日誌
docker-compose logs -f nginx

# 或直接查看日誌檔案
tail -f nginx/logs/jira-cs-access.log
tail -f nginx/logs/jira-cs-error.log
```

### 重啟服務

```bash
# 重啟所有服務
docker-compose restart

# 只重啟應用程式
docker-compose restart jira-cs-server

# 只重啟 Nginx
docker-compose restart nginx
```

### 更新部署

```bash
# 1. 拉取最新程式碼
git pull

# 2. 重新建置並啟動
docker-compose up -d --build

# 3. 清理舊映像檔（可選）
docker image prune -f
```

### 備份與還原

```bash
# 備份設定
tar -czf backup-$(date +%Y%m%d).tar.gz .env nginx/

# 還原設定
tar -xzf backup-20250114.tar.gz
```

## 監控與維護

### 資源監控

```bash
# 查看容器資源使用情況
docker stats

# 查看磁碟使用情況
docker system df
```

### 日誌管理

日誌檔案會自動輪替（設定在 docker-compose.yml）：

  - 最大檔案大小: 10MB
  - 保留檔案數: 3

手動清理日誌：

```bash
# 清理 Docker 日誌
docker-compose down
rm -rf nginx/logs/*
docker-compose up -d
```

### 效能優化

1.  **調整 Nginx worker 數量**

    ```nginx
    # nginx/nginx.conf
    worker_processes auto;  # 自動匹配 CPU 核心數
    ```

2.  **調整 Node.js 記憶體限制**

    ```yaml
    # docker-compose.yml
    environment:
      - NODE_OPTIONS=--max-old-space-size=2048
    ```

## 故障排除

### 問題 1: 容器無法啟動

```bash
# 查看詳細日誌
docker-compose logs jira-cs-server

# 檢查環境變數
docker-compose exec jira-cs-server env

# 重新建置
docker-compose down
docker-compose up -d --build --force-recreate
```

### 問題 2: 無法連線到 API

```bash
# 檢查連接埠是否開放
netstat -tuln | grep -E '80|8080|3000'

# 檢查防火牆
sudo ufw status
sudo firewall-cmd --list-all

# 測試容器內部連線
docker-compose exec nginx curl http://jira-cs-server:3000/health
```

### 問題 3: Nginx 502 Bad Gateway

```bash
# 檢查應用程式是否正常運作
docker-compose ps
curl http://localhost:3000/health

# 檢查 Nginx 設定
docker-compose exec nginx nginx -t

# 重新載入 Nginx
docker-compose exec nginx nginx -s reload
```

### 問題 4: 記憶體不足

```bash
# 查看記憶體使用情況
docker stats

# 增加 swap 空間（臨時解決方案）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 問題 5: 環境變數未生效

```bash
# 檢查環境變數
docker-compose exec jira-cs-server printenv | grep -E 'OPENAI|JIRA'

# 重新啟動（確保 .env 檔案正確）
docker-compose down
docker-compose up -d
```

## API 端點

| 端點 | 方法 | 描述 |
|------|------|------|
| `/api/jira/process` | POST | 處理工單並傳送評論到 Jira |
| `/api/jira/process_test` | POST | 處理工單但不傳送評論（測試） |
| `/api/jira/batch` | POST | 批次處理工單 |
| `/api/jira/health` | GET | 系統健康檢查 |
| `/api/jira/info` | GET | 系統資訊 |
| `/health` | GET | 基本健康檢查 |

## 安全建議

1.  **使用 HTTPS**

      - 在生產環境中設定 SSL/TLS
      - 可使用 Let's Encrypt 免費證書

2.  **限制存取**

    ```nginx
    # 在 nginx/conf.d/jira-cs-server.conf 中新增
    allow 10.0.0.0/8;   # 允許內網
    deny all;           # 拒絕其他
    ```

3.  **環境變數安全**

      - 不要提交 `.env` 檔案到 Git
      - 使用 Docker secrets 或環境變數管理工具

4.  **定期更新**

    ```bash
    # 更新基礎映像檔
    docker pull node:20-alpine
    docker pull nginx:alpine

    # 重新建置
    docker-compose build --no-cache
    ```

## 支援

如有問題，請查看：

  - 應用程式日誌: `docker-compose logs jira-cs-server`
  - Nginx 日誌: `nginx/logs/`
  - 健康檢查: `curl http://localhost/health`