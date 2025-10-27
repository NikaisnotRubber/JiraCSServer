"""
API 客戶端服務

負責與後端 Jira CS Server 進行通信,處理所有 API 請求。
"""
import requests
import time
from typing import Dict, Any, Optional
from config.settings import settings


class APIClientError(Exception):
    """API 客戶端異常"""
    pass


class APIClient:
    """
    API 客戶端類

    負責與後端服務進行所有 HTTP 通信,包括:
    - 發送用戶問題到後端處理
    - 檢查系統健康狀態
    - 獲取系統信息
    """

    def __init__(self):
        self.base_url = settings.api.base_url
        self.timeout = settings.api.timeout
        self.max_retries = settings.api.max_retries
        self.retry_delay = settings.api.retry_delay

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """
        發送 HTTP 請求(內部方法)

        Args:
            method: HTTP 方法 (GET, POST 等)
            endpoint: API 端點路徑
            data: 請求數據
            retry_count: 當前重試次數

        Returns:
            API 響應數據

        Raises:
            APIClientError: API 請求失敗時拋出
        """
        url = f"{self.base_url}{endpoint}"

        try:
            if method.upper() == "GET":
                response = requests.get(url, timeout=self.timeout)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=self.timeout)
            else:
                raise APIClientError(f"不支持的 HTTP 方法: {method}")

            # 檢查響應狀態
            response.raise_for_status()

            return response.json()

        except requests.exceptions.Timeout:
            if retry_count < self.max_retries:
                print(f"⚠️ 請求超時,正在重試 ({retry_count + 1}/{self.max_retries})...")
                time.sleep(self.retry_delay)
                return self._make_request(method, endpoint, data, retry_count + 1)
            else:
                raise APIClientError(f"請求超時,已重試 {self.max_retries} 次")

        except requests.exceptions.ConnectionError:
            raise APIClientError(f"無法連接到後端服務器: {self.base_url}")

        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP 錯誤: {e.response.status_code}"
            try:
                error_data = e.response.json()
                if "error" in error_data:
                    error_msg += f" - {error_data['error']}"
            except:
                pass
            raise APIClientError(error_msg)

        except Exception as e:
            raise APIClientError(f"API 請求失敗: {str(e)}")

    def process_issue(
        self,
        project_id: str,
        question: str,
        reporter: str = "Streamlit User",
        issue_type: str = "Question"
    ) -> Dict[str, Any]:
        """
        處理用戶問題

        Args:
            project_id: Jira 專案 ID (例如: "JCSC-1")
            question: 用戶問題內容
            reporter: 報告者姓名
            issue_type: 問題類型

        Returns:
            包含 AI 回應和處理信息的字典
        """
        # 構建符合後端 API 要求的請求數據
        payload = {
            "forms": {
                "Project ID": project_id,
                "Issue Type": issue_type,
                "Reporter": reporter,
                "Summary": question[:100],  # 使用問題前 100 字符作為摘要
                "Comment": {
                    "Content": question,
                    "Author": reporter
                }
            }
        }

        print(f"📤 發送請求到後端: {project_id}")
        response = self._make_request("POST", settings.api.process_endpoint, payload)

        # 解析響應
        if response.get("success"):
            data = response.get("data", {})
            return {
                "success": True,
                "answer": data.get("comment_content", ""),
                "classification": data.get("classification", {}),
                "quality_score": data.get("quality_score"),
                "processing_time": data.get("processing_time", 0),
                "workflow_id": data.get("workflow_id", ""),
                "metadata": {
                    "issue_key": data.get("issue_key", ""),
                    "source": data.get("Source", ""),
                    "processing_steps": data.get("processing_steps", [])
                }
            }
        else:
            return {
                "success": False,
                "error": response.get("error", "未知錯誤"),
                "details": response.get("details")
            }

    def check_health(self) -> Dict[str, Any]:
        """
        檢查後端系統健康狀態

        Returns:
            系統健康信息
        """
        try:
            response = self._make_request("GET", settings.api.health_endpoint)
            return {
                "healthy": response.get("success", False),
                "data": response.get("data", {})
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e)
            }

    def get_system_info(self) -> Dict[str, Any]:
        """
        獲取系統信息

        Returns:
            系統信息字典
        """
        try:
            response = self._make_request("GET", settings.api.info_endpoint)
            return response.get("data", {})
        except Exception as e:
            return {
                "error": str(e)
            }


# 全局 API 客戶端實例
api_client = APIClient()
