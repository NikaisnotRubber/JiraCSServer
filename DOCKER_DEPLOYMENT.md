# Docker 部署指南 - 含 PostgreSQL 上下文存儲

本指南說明如何使用 Docker Compose 部署完整的 Jira CS Server,包含 PostgreSQL 資料庫的記憶功能。

---

## 📋 系統架構

```
┌─────────────────────────────────────────────────┐
│              Docker Compose                     │
│                                                  │
│  ┌──────────────┐      ┌──────────────┐        │
│  │    Nginx     │─────▶│   Next.js    │        │
│  │  (反向代理)   │      │    App       │        │
│  └──────────────┘      └──────────────┘        │
│   Ports: 80, 8080           │                   │
│                             │                   │
│                             ▼                   │
│                      ┌──────────────┐           │
│                      │  PostgreSQL  │           │
│                      │  (上下文存儲) │           │
│                      └──────────────┘           │
│                       Port: 5432                │
│                       Volume: postgres_data     │
└─────────────────────────────────────────────────┘
```

### 服務組件

1. **postgres** - PostgreSQL 16 資料庫
   - 上下文存儲系統
   - 自動初始化資料表
   - 持久化數據存儲

2. **jira-cs-server** - Next.js 應用
   - AI Agent 工作流
   - 自動連接資料庫
   - 健康檢查

3. **nginx** - 反向代理
   - 端口 80, 8080
   - 負載均衡
   - 訪問日誌

---

## 🚀 快速開始

### 前置要求

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **WSL 2** (Windows 用戶)

### 1. 環境配置

```bash
# 在 WSL 中執行
cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer

# 複製環境變數模板
cp .env.example .env

# 編輯配置
nano .env
```

**必須配置的變數**:

```bash
# OpenAI API
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o

# Jira API
JIRA_BASE_URL=https://jirastage.deltaww.com
JIRA_AUTH_TOKEN=your-token-here

# PostgreSQL (使用默認值或自定義)
DATABASE_NAME=jira_cs
DATABASE_USER=postgres
DATABASE_PASSWORD=your-secure-password-here
```

### 2. 啟動服務

```bash
# 在 WSL 中執行
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 查看服務狀態
docker-compose ps
```

### 3. 驗證部署

```bash
# 檢查服務健康狀態
curl http://localhost/health

# 檢查詳細健康信息
curl http://localhost/api/jira/health

# 查看資料庫狀態
docker-compose exec postgres pg_isready -U postgres
```

---

## 🗄️ 資料庫管理

### 查看資料庫狀態

```bash
# 在 WSL 中執行

# 進入 PostgreSQL 容器
docker-compose exec postgres psql -U postgres -d jira_cs

# 查看所有表
\dt

# 查看表結構
\d project_contexts
\d conversation_turns
\d compression_history

# 退出
\q
```

### 查看統計信息

```bash
# 在應用容器中運行統計命令
docker-compose exec jira-cs-server node -e "
  const { maintenanceService } = require('./src/utils/database-maintenance.ts');
  maintenanceService.getStats().then(stats => console.log(JSON.stringify(stats, null, 2)));
"
```

### 運行維護任務

```bash
# 清理舊數據 + 壓縮上下文
docker-compose exec jira-cs-server npm run db:maintain

# 查看統計
docker-compose exec jira-cs-server npm run db:stats
```

### 資料備份

```bash
# 在 WSL 中執行

# 備份整個資料庫
docker-compose exec postgres pg_dump -U postgres jira_cs > backup-$(date +%Y%m%d).sql

# 恢復備份
docker-compose exec -T postgres psql -U postgres jira_cs < backup-20251020.sql

# 只備份數據 (不包含 schema)
docker-compose exec postgres pg_dump -U postgres -a jira_cs > data-backup.sql
```

---

## 📊 環境變數完整列表

### OpenAI 配置

```bash
OPENAI_API_KEY=sk-xxx                          # 必需
OPENAI_MODEL=gpt-4o                            # 默認: gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1     # 默認值
```

### Jira 配置

```bash
JIRA_BASE_URL=https://jirastage.deltaww.com    # 必需
JIRA_AUTH_TOKEN=xxx                            # 必需 (Base64)
```

### PostgreSQL 配置

```bash
DATABASE_NAME=jira_cs                          # 默認: jira_cs
DATABASE_USER=postgres                         # 默認: postgres
DATABASE_PASSWORD=postgres                     # 建議修改!
DATABASE_HOST=postgres                         # 容器內主機名
DATABASE_PORT=5432                             # 默認: 5432
DATABASE_SSL=false                             # 容器內不需要 SSL
DATABASE_MAX_CONNECTIONS=10                    # 默認: 10
DATABASE_IDLE_TIMEOUT=30000                    # 默認: 30s
DATABASE_CONNECTION_TIMEOUT=5000               # 默認: 5s
```

### 上下文壓縮配置

```bash
CONTEXT_COMPRESSION_TURN_THRESHOLD=5           # 默認: 5 輪
CONTEXT_COMPRESSION_TOKEN_THRESHOLD=10000      # 默認: 10000
CONTEXT_KEEP_RECENT_TURNS=3                    # 默認: 3 輪
CONTEXT_COMPRESSION_MODEL=gpt-4o-mini          # 默認值
CONTEXT_MAX_COMPRESSED_TOKENS=3000             # 默認: 3000
```

### 應用配置

```bash
NODE_ENV=production                            # 生產環境
PORT=3000                                      # 應用端口
LOG_LEVEL=info                                 # 日誌級別
TEST_MODE=false                                # 測試模式
USE_V2_AGENTS=true                             # 使用 V2 Agent
```

---

## 🔧 常用命令

### 服務管理

```bash
# 在 WSL 中執行

# 啟動所有服務
docker-compose up -d

# 停止所有服務
docker-compose down

# 重啟服務
docker-compose restart

# 重啟特定服務
docker-compose restart jira-cs-server
docker-compose restart postgres

# 查看服務狀態
docker-compose ps

# 查看資源使用
docker stats
```

### 日誌查看

```bash
# 查看所有日誌
docker-compose logs -f

# 查看特定服務日誌
docker-compose logs -f jira-cs-server
docker-compose logs -f postgres
docker-compose logs -f nginx

# 查看最近 100 行
docker-compose logs --tail=100 jira-cs-server
```

### 進入容器

```bash
# 進入應用容器
docker-compose exec jira-cs-server sh

# 進入資料庫容器
docker-compose exec postgres bash

# 進入 Nginx 容器
docker-compose exec nginx sh
```

### 更新部署

```bash
# 在 WSL 中執行

# 拉取最新代碼
git pull

# 重新構建並啟動
docker-compose up -d --build

# 或強制重新創建
docker-compose up -d --build --force-recreate
```

---

## 📁 數據持久化

### Volume 說明

```yaml
volumes:
  postgres_data:
    driver: local
```

PostgreSQL 數據存儲在 Docker volume `postgres_data` 中,即使容器刪除,數據也會保留。

### 查看 Volume

```bash
# 列出所有 volumes
docker volume ls

# 查看 volume 詳情
docker volume inspect jiracsserver_postgres_data

# Volume 實際位置 (Linux)
# /var/lib/docker/volumes/jiracsserver_postgres_data/_data
```

### 刪除 Volume (危險!)

```bash
# ⚠️ 警告:這會刪除所有數據!

# 停止服務
docker-compose down

# 刪除 volume
docker-compose down -v

# 或手動刪除
docker volume rm jiracsserver_postgres_data
```

---

## 🔒 安全最佳實踐

### 1. 修改默認密碼

```bash
# 在 .env 中設置強密碼
DATABASE_PASSWORD=YourSecurePassword123!@#
```

### 2. 限制端口暴露

```yaml
# docker-compose.yml 中
# 只在需要時暴露 PostgreSQL 端口
services:
  postgres:
    ports:
      # - "5432:5432"  # 註釋掉,只允許容器內訪問
```

### 3. 使用環境變數文件權限

```bash
# 在 WSL 中執行
chmod 600 .env
```

### 4. 定期備份

```bash
# 設置 cron job 自動備份
0 2 * * * cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer && docker-compose exec postgres pg_dump -U postgres jira_cs > /backup/jira_cs_$(date +\%Y\%m\%d).sql
```

---

## 🐛 故障排查

### 問題 1: 資料庫連接失敗

**症狀**:
```
⚠️ Database initialization failed, context features disabled
```

**解決方案**:

```bash
# 檢查 PostgreSQL 是否運行
docker-compose ps postgres

# 查看 PostgreSQL 日誌
docker-compose logs postgres

# 測試連接
docker-compose exec postgres pg_isready -U postgres

# 重啟 PostgreSQL
docker-compose restart postgres
```

### 問題 2: 初始化腳本未執行

**症狀**: 資料表不存在

**解決方案**:

```bash
# 檢查 init-db.sh 是否有執行權限
chmod +x docker/init-db.sh

# 完全重建資料庫
docker-compose down -v
docker-compose up -d

# 手動執行初始化
docker-compose exec postgres bash /docker-entrypoint-initdb.d/init-db.sh
```

### 問題 3: 容器無法啟動

**症狀**: `docker-compose up` 失敗

**解決方案**:

```bash
# 查看詳細錯誤
docker-compose up

# 檢查環境變數
docker-compose config

# 重新構建
docker-compose build --no-cache
docker-compose up -d
```

### 問題 4: 記憶體不足

**症狀**: 容器頻繁重啟

**解決方案**:

```yaml
# 在 docker-compose.yml 中添加資源限制
services:
  jira-cs-server:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### 問題 5: Volume 空間不足

```bash
# 查看 Docker 磁盤使用
docker system df

# 清理未使用的資源
docker system prune

# 清理未使用的 volumes (小心!)
docker volume prune
```

---

## 📈 監控與維護

### 健康檢查

```bash
# 檢查所有服務健康狀態
docker-compose ps

# 檢查應用健康
curl http://localhost/health
curl http://localhost/api/jira/health

# 檢查資料庫健康
docker-compose exec postgres pg_isready
```

### 性能監控

```bash
# 查看資源使用
docker stats

# 查看容器日誌大小
docker-compose logs --tail=0 jira-cs-server 2>&1 | wc -c

# 查看資料庫大小
docker-compose exec postgres psql -U postgres -d jira_cs -c "
  SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
  FROM pg_database;
"
```

### 定期維護任務

```bash
# 創建維護腳本 maintenance.sh
cat > maintenance.sh <<'EOF'
#!/bin/bash
echo "🧹 Starting maintenance..."

# 運行資料庫維護
docker-compose exec jira-cs-server npm run db:maintain

# 清理 Docker 日誌
truncate -s 0 $(docker inspect --format='{{.LogPath}}' jira-cs-server)

# 備份資料庫
docker-compose exec postgres pg_dump -U postgres jira_cs > /backup/jira_cs_$(date +%Y%m%d).sql

echo "✅ Maintenance complete!"
EOF

chmod +x maintenance.sh

# 設置 cron job (每天凌晨 2 點)
crontab -e
# 添加: 0 2 * * * /path/to/maintenance.sh
```

---

## 🔄 升級與遷移

### 升級應用版本

```bash
# 在 WSL 中執行

# 1. 拉取最新代碼
git pull

# 2. 停止服務
docker-compose down

# 3. 重新構建
docker-compose build --no-cache

# 4. 啟動服務
docker-compose up -d

# 5. 查看日誌確認
docker-compose logs -f jira-cs-server
```

### 資料遷移

```bash
# 從舊環境遷移數據

# 1. 從舊環境匯出
docker-compose exec postgres pg_dump -U postgres jira_cs > old_data.sql

# 2. 複製到新環境
scp old_data.sql user@new-server:/backup/

# 3. 在新環境導入
docker-compose exec -T postgres psql -U postgres jira_cs < old_data.sql
```

---

## 📝 檢查清單

### 部署前

- [ ] 安裝 Docker 和 Docker Compose
- [ ] 配置 `.env` 文件
- [ ] 設置強密碼
- [ ] 檢查端口是否可用 (80, 3000, 5432)
- [ ] 確保有足夠的磁盤空間 (至少 10GB)

### 部署後

- [ ] 驗證服務運行: `docker-compose ps`
- [ ] 測試健康檢查: `curl http://localhost/health`
- [ ] 檢查資料庫連接: `docker-compose exec postgres pg_isready`
- [ ] 查看應用日誌: `docker-compose logs jira-cs-server`
- [ ] 測試上下文功能: 運行兩次相同 Project ID 的請求
- [ ] 設置自動備份
- [ ] 配置監控告警

### 維護

- [ ] 定期備份資料庫 (建議每天)
- [ ] 運行維護任務: `docker-compose exec jira-cs-server npm run db:maintain`
- [ ] 檢查日誌大小
- [ ] 監控資源使用
- [ ] 更新安全補丁

---

## 🎯 生產環境建議

### 1. 使用外部 PostgreSQL

對於生產環境,建議使用托管的 PostgreSQL 服務 (如 AWS RDS, Azure Database):

```yaml
# docker-compose.yml
services:
  jira-cs-server:
    environment:
      - DATABASE_URL=postgresql://user:pass@external-db.example.com:5432/jira_cs
      # 不需要啟動 postgres 服務
```

### 2. 使用 Secrets 管理

```bash
# 使用 Docker Secrets
echo "your-db-password" | docker secret create db_password -

# 在 docker-compose.yml 中引用
secrets:
  db_password:
    external: true
```

### 3. 設置反向代理 (Nginx/Traefik)

```yaml
# 添加 SSL/TLS 支持
nginx:
  volumes:
    - ./ssl:/etc/nginx/ssl:ro
  ports:
    - "443:443"
```

### 4. 配置日誌輪替

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "5"
```

---

## 📚 相關文檔

- [CLAUDE.md](./CLAUDE.md) - 項目規範
- [CONTEXT_STORAGE.md](./CONTEXT_STORAGE.md) - 上下文系統技術文檔
- [QUICKSTART_CONTEXT.md](./QUICKSTART_CONTEXT.md) - 快速開始
- [README.md](./README.md) - 項目總覽

---

**版本**: 2.0.0
**最後更新**: 2025-10-20
**維護者**: ALVIS.MC.TSAO
