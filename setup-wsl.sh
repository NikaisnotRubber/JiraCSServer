#!/bin/bash

###############################################################################
# WSL 環境快速設置腳本
#
# 使用方法:
#   1. 在 Windows 中打開 WSL: wsl
#   2. 導航到項目目錄: cd /mnt/c/Users/ALVIS.MC.TSAO/worKspace/JiraCSServer
#   3. 賦予執行權限: chmod +x setup-wsl.sh
#   4. 運行腳本: ./setup-wsl.sh
###############################################################################

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印帶顏色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 檢查是否在 WSL 中
check_wsl() {
    print_section "檢查 WSL 環境"

    if grep -qi microsoft /proc/version; then
        print_success "✅ 正在 WSL 環境中運行"
    else
        print_error "❌ 不在 WSL 環境中!"
        print_error "請在 Windows 中運行: wsl"
        exit 1
    fi
}

# 檢查 Node.js
check_node() {
    print_section "檢查 Node.js"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "✅ Node.js 已安裝: $NODE_VERSION"

        # 檢查版本是否 >= 18
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_warning "⚠️  Node.js 版本過舊,建議升級到 18.0.0 或更高"
        fi
    else
        print_error "❌ Node.js 未安裝"
        print_info "請安裝 Node.js 18+:"
        print_info "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
        print_info "  sudo apt-get install -y nodejs"
        exit 1
    fi
}

# 檢查 npm/pnpm
check_package_manager() {
    print_section "檢查包管理器"

    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm -v)
        print_success "✅ pnpm 已安裝: $PNPM_VERSION"
        PKG_MANAGER="pnpm"
    elif command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_success "✅ npm 已安裝: $NPM_VERSION"
        PKG_MANAGER="npm"
    else
        print_error "❌ 未找到包管理器"
        exit 1
    fi
}

# 安裝依賴
install_dependencies() {
    print_section "安裝項目依賴"

    if [ -d "node_modules" ]; then
        print_warning "node_modules 已存在,是否重新安裝? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_info "刪除舊的 node_modules..."
            rm -rf node_modules
            rm -f package-lock.json
        else
            print_info "跳過依賴安裝"
            return
        fi
    fi

    print_info "使用 $PKG_MANAGER 安裝依賴..."
    $PKG_MANAGER install

    print_success "✅ 依賴安裝完成"
}

# 檢查 .env 文件
check_env_file() {
    print_section "檢查環境變數配置"

    if [ -f ".env" ]; then
        print_success "✅ .env 文件已存在"
    else
        print_warning "⚠️  .env 文件不存在"
        print_info "是否從 .env.example 創建? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            cp .env.example .env
            print_success "✅ 已創建 .env 文件"
            print_warning "⚠️  請編輯 .env 文件並填入必要的配置!"
            print_info "  nano .env  或  vim .env"
        fi
    fi
}

# 檢查 PostgreSQL
check_postgres() {
    print_section "檢查 PostgreSQL"

    # 檢查 Docker
    if command -v docker &> /dev/null; then
        print_success "✅ Docker 已安裝"

        # 檢查是否有運行的 PostgreSQL 容器
        if docker ps | grep -q postgres; then
            print_success "✅ PostgreSQL 容器正在運行"
        else
            print_warning "⚠️  未找到運行中的 PostgreSQL 容器"
            print_info "是否啟動 PostgreSQL Docker 容器? (y/n)"
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                start_postgres_docker
            else
                print_info "請手動啟動 PostgreSQL 或查看 QUICKSTART_CONTEXT.md"
            fi
        fi
    else
        print_warning "⚠️  Docker 未安裝"
        print_info "請安裝 Docker 或手動設置 PostgreSQL"
        print_info "Docker 安裝: https://docs.docker.com/engine/install/"
    fi
}

# 啟動 PostgreSQL Docker 容器
start_postgres_docker() {
    print_info "啟動 PostgreSQL Docker 容器..."

    # 檢查是否已有同名容器
    if docker ps -a | grep -q jira-cs-postgres; then
        print_info "容器 jira-cs-postgres 已存在,啟動它..."
        docker start jira-cs-postgres
    else
        print_info "創建新的 PostgreSQL 容器..."
        print_info "請輸入 PostgreSQL 密碼 (默認: postgres):"
        read -r password
        password=${password:-postgres}

        docker run --name jira-cs-postgres \
            -e POSTGRES_PASSWORD=$password \
            -e POSTGRES_DB=jira_cs \
            -p 5432:5432 \
            -d postgres:16

        print_success "✅ PostgreSQL 容器已啟動"
        print_info "連接字符串: postgresql://postgres:$password@localhost:5432/jira_cs"
        print_warning "⚠️  請更新 .env 文件中的 DATABASE_URL"
    fi
}

# 初始化資料庫
init_database() {
    print_section "初始化資料庫"

    print_info "是否初始化資料庫表? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_info "運行 npm run db:init..."
        $PKG_MANAGER run db:init
        print_success "✅ 資料庫初始化完成"
    else
        print_info "跳過資料庫初始化"
        print_info "稍後可運行: npm run db:init"
    fi
}

# 運行測試
run_tests() {
    print_section "運行測試"

    print_info "是否運行 Mock 測試? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_info "運行測試..."
        $PKG_MANAGER run test:mock
        print_success "✅ 測試完成"
    else
        print_info "跳過測試"
    fi
}

# 顯示後續步驟
show_next_steps() {
    print_section "🎉 設置完成!"

    echo ""
    echo -e "${GREEN}後續步驟:${NC}"
    echo ""
    echo "1. 編輯環境變數:"
    echo -e "   ${YELLOW}nano .env${NC}"
    echo ""
    echo "2. 啟動開發服務器:"
    echo -e "   ${YELLOW}$PKG_MANAGER run dev${NC}     # Next.js 開發模式"
    echo -e "   ${YELLOW}$PKG_MANAGER run server:dev${NC}  # Express 開發模式"
    echo ""
    echo "3. 運行測試:"
    echo -e "   ${YELLOW}$PKG_MANAGER run test:mock${NC}   # Mock 測試"
    echo ""
    echo "4. 資料庫操作:"
    echo -e "   ${YELLOW}$PKG_MANAGER run db:stats${NC}    # 查看統計"
    echo -e "   ${YELLOW}$PKG_MANAGER run db:maintain${NC}  # 維護任務"
    echo ""
    echo "5. 閱讀文檔:"
    echo -e "   ${YELLOW}cat CLAUDE.md${NC}                # 項目規範"
    echo -e "   ${YELLOW}cat QUICKSTART_CONTEXT.md${NC}    # 快速開始"
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}準備就緒! 開始開發吧! 🚀${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# 主函數
main() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Jira CS Server - WSL 環境設置腳本   ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""

    check_wsl
    check_node
    check_package_manager
    install_dependencies
    check_env_file
    check_postgres
    init_database
    run_tests
    show_next_steps
}

# 運行主函數
main
