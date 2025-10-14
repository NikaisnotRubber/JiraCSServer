# JiraCSServer 部署指南

## 📋 目录

- [前置要求](#前置要求)
- [本地开发](#本地开发)
- [Docker 部署](#docker-部署)
- [生产环境部署](#生产环境部署)
- [故障排查](#故障排查)

## 前置要求

### 软件要求

- Docker >= 20.10
- Docker Compose >= 2.0
- Node.js >= 20 (本地开发)
- pnpm >= 9.0 (本地开发)

### 环境变量

确保 `.env` 文件已正确配置：

```bash
# OpenAI 配置
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gemini-flash-latest
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/

# Jira 配置
JIRA_BASE_URL=https://jirastage.deltaww.com
JIRA_AUTH_TOKEN=YWx2aXMuYWRtaW46UGFyYTk0Nzg=

# 应用配置
NODE_ENV=production
TEST_MODE=false
PORT=3000
```

## 本地开发

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动开发服务器

```bash
pnpm dev
```

服务器将在 `http://localhost:3000` 启动

### 3. 测试 API

```bash
# 健康检查
curl http://localhost:3000/health

# 测试处理端点（不发送到 Jira）
curl -X POST http://localhost:3000/api/jira/process_test \
  -H "Content-Type: application/json" \
  -d @test-data.json
```

## Docker 部署

### 快速启动

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 服务访问

启动后，服务可通过以下端口访问：

- **端口 80**: `http://your-server-ip/api/jira/process`
- **端口 8080**: `http://your-server-ip:8080/api/jira/process`
- **端口 3000**: 直接访问 Next.js 应用（仅用于调试）

### 架构说明

```
┌─────────────┐
│   客户端    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Nginx (端口 80/8080)              │
│   - 反向代理                         │
│   - 负载均衡                         │
│   - 日志记录                         │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   JiraCSServer (端口 3000)          │
│   - Next.js 应用                     │
│   - API 路由处理                     │
│   - LangGraph 工作流                 │
└─────────────────────────────────────┘
```

## 生产环境部署

### 方法 1: 使用 Docker Compose（推荐）

```bash
# 1. 克隆代码到服务器
git clone <your-repo> /opt/jira-cs-server
cd /opt/jira-cs-server

# 2. 配置环境变量
cp .env.example .env
vim .env  # 编辑配置

# 3. 构建并启动
docker-compose up -d --build

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f jira-cs-server
docker-compose logs -f nginx
```

### 方法 2: 使用现有 Nginx

如果您的服务器已有 Nginx，可以只运行应用容器：

```bash
# 1. 只启动应用服务
docker-compose up -d jira-cs-server

# 2. 配置现有 Nginx
# 将 nginx/conf.d/jira-cs-server.conf 的内容添加到您的 Nginx 配置
# 注意修改 upstream 为: localhost:3000
```

### 方法 3: 独立 Docker 运行

```bash
# 构建镜像
docker build -t jira-cs-server:latest .

# 运行容器
docker run -d \
  --name jira-cs-server \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  jira-cs-server:latest

# 配置 Nginx 反向代理到 localhost:3000
```

## 服务管理

### 查看服务状态

```bash
# Docker Compose
docker-compose ps

# 健康检查
curl http://localhost/health
curl http://localhost:8080/health
```

### 查看日志

```bash
# 应用日志
docker-compose logs -f jira-cs-server

# Nginx 日志
docker-compose logs -f nginx

# 或直接查看日志文件
tail -f nginx/logs/jira-cs-access.log
tail -f nginx/logs/jira-cs-error.log
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 只重启应用
docker-compose restart jira-cs-server

# 只重启 Nginx
docker-compose restart nginx
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker-compose up -d --build

# 3. 清理旧镜像（可选）
docker image prune -f
```

### 备份与恢复

```bash
# 备份配置
tar -czf backup-$(date +%Y%m%d).tar.gz .env nginx/

# 恢复配置
tar -xzf backup-20250114.tar.gz
```

## 监控与维护

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df
```

### 日志管理

日志文件会自动轮换（配置在 docker-compose.yml）：
- 最大文件大小: 10MB
- 保留文件数: 3

手动清理日志：
```bash
# 清理 Docker 日志
docker-compose down
rm -rf nginx/logs/*
docker-compose up -d
```

### 性能优化

1. **调整 Nginx worker 数量**
   ```nginx
   # nginx/nginx.conf
   worker_processes auto;  # 自动匹配 CPU 核心数
   ```

2. **调整 Node.js 内存限制**
   ```yaml
   # docker-compose.yml
   environment:
     - NODE_OPTIONS=--max-old-space-size=2048
   ```

## 故障排查

### 问题 1: 容器无法启动

```bash
# 查看详细日志
docker-compose logs jira-cs-server

# 检查环境变量
docker-compose exec jira-cs-server env

# 重新构建
docker-compose down
docker-compose up -d --build --force-recreate
```

### 问题 2: 无法连接到 API

```bash
# 检查端口是否开放
netstat -tuln | grep -E '80|8080|3000'

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-all

# 测试容器内部连接
docker-compose exec nginx curl http://jira-cs-server:3000/health
```

### 问题 3: Nginx 502 Bad Gateway

```bash
# 检查应用是否正常运行
docker-compose ps
curl http://localhost:3000/health

# 检查 Nginx 配置
docker-compose exec nginx nginx -t

# 重新加载 Nginx
docker-compose exec nginx nginx -s reload
```

### 问题 4: 内存不足

```bash
# 查看内存使用
docker stats

# 增加 swap 空间（临时解决）
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 问题 5: 环境变量未生效

```bash
# 检查环境变量
docker-compose exec jira-cs-server printenv | grep -E 'OPENAI|JIRA'

# 重新启动（确保 .env 文件正确）
docker-compose down
docker-compose up -d
```

## API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/jira/process` | POST | 处理工单并发送评论到 Jira |
| `/api/jira/process_test` | POST | 处理工单但不发送评论（测试） |
| `/api/jira/batch` | POST | 批量处理工单 |
| `/api/jira/health` | GET | 系统健康检查 |
| `/api/jira/info` | GET | 系统信息 |
| `/health` | GET | 基本健康检查 |

## 安全建议

1. **使用 HTTPS**
   - 在生产环境中配置 SSL/TLS
   - 可使用 Let's Encrypt 免费证书

2. **限制访问**
   ```nginx
   # 在 nginx/conf.d/jira-cs-server.conf 中添加
   allow 10.0.0.0/8;  # 允许内网
   deny all;           # 拒绝其他
   ```

3. **环境变量安全**
   - 不要提交 `.env` 文件到 Git
   - 使用 Docker secrets 或环境变量管理工具

4. **定期更新**
   ```bash
   # 更新基础镜像
   docker pull node:20-alpine
   docker pull nginx:alpine
   
   # 重新构建
   docker-compose build --no-cache
   ```

## 支持

如有问题，请查看：
- 应用日志: `docker-compose logs jira-cs-server`
- Nginx 日志: `nginx/logs/`
- 健康检查: `curl http://localhost/health`
