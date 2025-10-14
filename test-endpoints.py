#!/usr/bin/env python3
"""
JiraCSServer v2.0 端點測試腳本
測試所有 API 端點並顯示結果
"""

import requests
import json
import os
from pathlib import Path
from datetime import datetime

BASE_URL = "http://localhost:3000"
PAYLOADS_DIR = "test-payloads"
RESULTS_DIR = "test-results"

# 顏色代碼
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    RESET = '\033[0m'

def print_header(text):
    """打印標題"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BLUE}{text:^60}{Colors.RESET}")
    print(f"{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_test(name, status, details=""):
    """打印測試結果"""
    icon = "✅" if status == "success" else "❌"
    color = Colors.GREEN if status == "success" else Colors.RED
    print(f"{color}{icon} {name}{Colors.RESET}")
    if details:
        print(f"   {details}")

def save_result(name, data):
    """保存測試結果"""
    os.makedirs(RESULTS_DIR, exist_ok=True)
    filename = f"{RESULTS_DIR}/{name.replace(' ', '_')}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return filename

def test_get_endpoint(name, endpoint):
    """測試 GET 端點"""
    try:
        print(f"\n{Colors.YELLOW}📡 測試: {name}{Colors.RESET}")
        print(f"   端點: GET {endpoint}")

        response = requests.get(f"{BASE_URL}{endpoint}")

        if response.status_code == 200:
            data = response.json()
            filename = save_result(name, data)
            print_test(name, "success", f"HTTP {response.status_code}")
            print(f"   已保存: {filename}")
            print(f"   {json.dumps(data, indent=2, ensure_ascii=False)[:200]}...")
            return True
        else:
            print_test(name, "failed", f"HTTP {response.status_code}")
            print(f"   {response.text}")
            return False
    except Exception as e:
        print_test(name, "failed", f"錯誤: {str(e)}")
        return False

def test_post_endpoint(name, endpoint, payload_file=None, payload_data=None):
    """測試 POST 端點"""
    try:
        print(f"\n{Colors.YELLOW}📡 測試: {name}{Colors.RESET}")
        print(f"   端點: POST {endpoint}")

        if payload_file:
            print(f"   數據: {payload_file}")
            with open(payload_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        elif payload_data:
            data = payload_data
        else:
            raise ValueError("需要提供 payload_file 或 payload_data")

        response = requests.post(
            f"{BASE_URL}{endpoint}",
            json=data,
            headers={'Content-Type': 'application/json'}
        )

        if 200 <= response.status_code < 300:
            result = response.json()
            filename = save_result(name, result)
            print_test(name, "success", f"HTTP {response.status_code}")
            print(f"   已保存: {filename}")

            # 顯示部分結果
            if 'data' in result:
                summary = {
                    'success': result.get('success'),
                    'issue_key': result['data'].get('issue_key'),
                    'workflow_id': result['data'].get('workflow_id'),
                    'processing_time': result['data'].get('processing_time')
                }
                print(f"   摘要: {json.dumps(summary, indent=2, ensure_ascii=False)}")
            return True
        else:
            print_test(name, "failed", f"HTTP {response.status_code}")
            print(f"   {response.text[:500]}")
            return False
    except Exception as e:
        print_test(name, "failed", f"錯誤: {str(e)}")
        return False

def main():
    """主測試函數"""
    print_header("JiraCSServer v2.0 端點測試")

    results = {
        'timestamp': datetime.now().isoformat(),
        'tests': [],
        'passed': 0,
        'failed': 0
    }

    # 測試列表
    tests = [
        # GET 端點
        ("健康檢查", "GET", "/api/jira/health", None),
        ("系統信息", "GET", "/api/jira/info", None),
        ("API 文檔", "GET", "/", None),
        ("postProcess 端點信息", "GET", "/api/jira/postProcess", None),

        # POST 端點 - 單一工單
        ("單一工單 - 登入問題", "POST", "/api/jira/process",
         f"{PAYLOADS_DIR}/01-single-login-issue.json"),
        ("單一工單 - 權限請求", "POST", "/api/jira/process",
         f"{PAYLOADS_DIR}/02-permission-request.json"),
        ("單一工單 - 欄位設置", "POST", "/api/jira/process",
         f"{PAYLOADS_DIR}/03-field-setup-jira.json"),
        ("單一工單 - 新帳號申請", "POST", "/api/jira/process",
         f"{PAYLOADS_DIR}/04-new-account-confluence.json"),
        ("單一工單 - 許願池", "POST", "/api/jira/process",
         f"{PAYLOADS_DIR}/05-wish-pool.json"),
        ("單一工單 - 匿名提交", "POST", "/api/jira/process",
         f"{PAYLOADS_DIR}/06-anonymous-submission.json"),

        # POST 端點 - 後續處理
        ("後續處理 - 追問", "POST", "/api/jira/postProcess",
         f"{PAYLOADS_DIR}/08-post-process.json"),

        # POST 端點 - 批量處理
        ("批量處理 - 3個工單", "POST", "/api/jira/batch",
         f"{PAYLOADS_DIR}/07-batch-request.json"),
    ]

    # 執行測試
    for test in tests:
        name, method, endpoint, payload = test

        if method == "GET":
            success = test_get_endpoint(name, endpoint)
        else:
            success = test_post_endpoint(name, endpoint, payload)

        results['tests'].append({
            'name': name,
            'method': method,
            'endpoint': endpoint,
            'success': success
        })

        if success:
            results['passed'] += 1
        else:
            results['failed'] += 1

    # 保存測試總結
    save_result('_test_summary', results)

    # 打印總結
    print_header("測試總結")
    print(f"總測試數: {len(tests)}")
    print(f"{Colors.GREEN}通過: {results['passed']}{Colors.RESET}")
    print(f"{Colors.RED}失敗: {results['failed']}{Colors.RESET}")
    print(f"\n📁 所有結果已保存到: {Colors.GREEN}{RESULTS_DIR}/{Colors.RESET}\n")

if __name__ == "__main__":
    main()
