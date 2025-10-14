#!/bin/bash

# JiraCSServer 部署脚本
# 使用方法: ./deploy.sh [start|stop|restart|logs|status]

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
}

# 检查 .env 文件
check_env() {
    if [ ! -f ".env" ]; then
        log_error ".env 文件不存在"
        log_info "请创建 .env 文件并配置必要的环境变量"
        exit 1
    fi
}

# 启动服务
start() {
    log_info "正在启动 JiraCSServer..."
    check_docker
    check_env
    
    docker-compose up -d --build
    
    log_info "等待服务启动..."
    sleep 10
    
    # 健康检查
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_info "✅ 服务启动成功！"
        log_info "访问地址:"
        log_info "  - http://localhost/api/jira/info"
        log_info "  - http://localhost:8080/api/jira/info"
    else
        log_warn "服务可能未正常启动，请查看日志"
        docker-compose logs --tail=50
    fi
}

# 停止服务
stop() {
    log_info "正在停止 JiraCSServer..."
    docker-compose down
    log_info "✅ 服务已停止"
}

# 重启服务
restart() {
    log_info "正在重启 JiraCSServer..."
    stop
    sleep 2
    start
}

# 查看日志
logs() {
    docker-compose logs -f --tail=100
}

# 查看状态
status() {
    log_info "服务状态:"
    docker-compose ps
    
    echo ""
    log_info "健康检查:"
    
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_info "✅ 端口 80: 正常"
    else
        log_error "❌ 端口 80: 异常"
    fi
    
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_info "✅ 端口 8080: 正常"
    else
        log_error "❌ 端口 8080: 异常"
    fi
}

# 主函数
main() {
    case "${1:-}" in
        start)
            start
            ;;
        stop)
            stop
            ;;
        restart)
            restart
            ;;
        logs)
            logs
            ;;
        status)
            status
            ;;
        *)
            echo "使用方法: $0 {start|stop|restart|logs|status}"
            echo ""
            echo "命令说明:"
            echo "  start   - 启动服务"
            echo "  stop    - 停止服务"
            echo "  restart - 重启服务"
            echo "  logs    - 查看实时日志"
            echo "  status  - 查看服务状态"
            exit 1
            ;;
    esac
}

main "$@"
