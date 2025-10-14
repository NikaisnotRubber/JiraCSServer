#!/bin/bash

# JiraCSServer v2.0 端點測試腳本
# 測試所有 API 端點並顯示結果

BASE_URL="http://localhost:3000"
RESULTS_DIR="test-results"

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 創建結果目錄
mkdir -p "$RESULTS_DIR"

# 顯示標題
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  JiraCSServer v2.0 端點測試${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# 測試函數
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data_file=$4
    local output_file="$RESULTS_DIR/${name// /_}.json"

    echo -e "${YELLOW}📡 測試: $name${NC}"
    echo -e "   端點: $method $endpoint"

    if [ -z "$data_file" ]; then
        # GET 請求
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    else
        # POST 請求
        echo -e "   數據: $data_file"
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d @"$data_file")
    fi

    # 分離響應體和狀態碼
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    # 保存結果
    echo "$body" | jq '.' > "$output_file" 2>/dev/null || echo "$body" > "$output_file"

    # 顯示結果
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "   ${GREEN}✅ 成功 (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "   ${RED}❌ 失敗 (HTTP $http_code)${NC}"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi

    echo ""
    sleep 1
}

# 測試 1: 健康檢查
test_endpoint "健康檢查" "GET" "/api/jira/health"

# 測試 2: 系統信息
test_endpoint "系統信息" "GET" "/api/jira/info"

# 測試 3: 根路由（API 文檔）
test_endpoint "API 文檔" "GET" "/"

# 測試 4: 單一工單處理 - 登入問題
test_endpoint "單一工單 - 登入問題" "POST" "/api/jira/process" \
    "test-payloads/01-single-login-issue.json"

# 測試 5: 單一工單處理 - 權限請求
test_endpoint "單一工單 - 權限請求" "POST" "/api/jira/process" \
    "test-payloads/02-permission-request.json"

# 測試 6: 單一工單處理 - 欄位設置（Jira 專屬）
test_endpoint "單一工單 - 欄位設置" "POST" "/api/jira/process" \
    "test-payloads/03-field-setup-jira.json"

# 測試 7: 單一工單處理 - 新帳號申請（Confluence 專屬）
test_endpoint "單一工單 - 新帳號申請" "POST" "/api/jira/process" \
    "test-payloads/04-new-account-confluence.json"

# 測試 8: 單一工單處理 - 許願池
test_endpoint "單一工單 - 許願池" "POST" "/api/jira/process" \
    "test-payloads/05-wish-pool.json"

# 測試 9: 單一工單處理 - 匿名提交
test_endpoint "單一工單 - 匿名提交" "POST" "/api/jira/process" \
    "test-payloads/06-anonymous-submission.json"

# 測試 10: 後續處理（追問）
test_endpoint "後續處理 - 追問" "POST" "/api/jira/postProcess" \
    "test-payloads/08-post-process.json"

# 測試 11: 批量處理
test_endpoint "批量處理 - 3個工單" "POST" "/api/jira/batch" \
    "test-payloads/07-batch-request.json"

# 測試 12: 查詢 postProcess 端點信息
test_endpoint "postProcess 端點信息" "GET" "/api/jira/postProcess"

# 總結
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  測試完成！${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "📁 測試結果已保存到: ${GREEN}$RESULTS_DIR/${NC}"
echo ""
echo -e "查看結果："
echo -e "  ${YELLOW}ls -lh $RESULTS_DIR/${NC}"
echo ""
echo -e "查看特定結果："
echo -e "  ${YELLOW}cat $RESULTS_DIR/健康檢查.json | jq '.'${NC}"
echo ""
