#!/bin/bash

# Streamlit 客戶端啟動腳本

set -e

# 顏色輸出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 啟動 Jira CS Assistant Streamlit 客戶端...${NC}"

# 檢查 .env 文件
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env 文件不存在${NC}"
    echo -e "${BLUE}正在從 .env.example 創建 .env...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env 文件已創建,請編輯配置${NC}"
fi

# 檢查 uv 是否安裝
if ! command -v uv &> /dev/null; then
    echo -e "${RED}❌ uv 未安裝${NC}"
    echo -e "${BLUE}請安裝 uv: curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
    exit 1
fi

# 檢查虛擬環境
if [ ! -d .venv ]; then
    echo -e "${BLUE}📦 初始化虛擬環境...${NC}"
    uv init
    uv sync
else
    echo -e "${GREEN}✅ 虛擬環境已存在${NC}"
fi

# 檢查後端服務
echo -e "${BLUE}🔍 檢查後端服務...${NC}"
BACKEND_URL=$(grep BACKEND_API_URL .env | cut -d '=' -f2)
if [ -z "$BACKEND_URL" ]; then
    BACKEND_URL="http://localhost:3000"
fi

if curl -s "$BACKEND_URL/api/jira/health" > /dev/null; then
    echo -e "${GREEN}✅ 後端服務運行正常${NC}"
else
    echo -e "${RED}⚠️  後端服務未運行或無法連接${NC}"
    echo -e "${BLUE}請確保後端服務在 $BACKEND_URL 運行${NC}"
    echo -e "${BLUE}提示: 在主項目目錄執行 'npm run server:dev'${NC}"
fi

# 檢查資料庫連接
echo -e "${BLUE}🔍 檢查資料庫連接...${NC}"
DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2)
if [ -z "$DB_URL" ]; then
    echo -e "${RED}⚠️  DATABASE_URL 未設置${NC}"
else
    echo -e "${GREEN}✅ 資料庫配置已設置${NC}"
fi

# 啟動 Streamlit
echo -e "${GREEN}🎉 啟動 Streamlit 應用...${NC}"
echo -e "${BLUE}訪問地址: http://localhost:8501${NC}"
echo ""

uv run streamlit run app.py
