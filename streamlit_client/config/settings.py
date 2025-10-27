"""
Streamlit 客戶端配置設定

此模組管理 Streamlit 客戶端的所有配置參數,包括 API 端點、UI 設定等。
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class APIConfig:
    """API 配置"""
    # 後端服務器 URL
    base_url: str = os.getenv("BACKEND_API_URL", "http://localhost:3000")

    # API 端點
    process_endpoint: str = "/api/jira/process_test"  # 使用測試端點,不發送到 Jira
    health_endpoint: str = "/api/jira/health"
    info_endpoint: str = "/api/jira/info"

    # 請求超時設定(秒)
    timeout: int = 120

    # 重試設定
    max_retries: int = 3
    retry_delay: int = 2


@dataclass
class UIConfig:
    """UI 配置"""
    # 頁面標題
    page_title: str = "Jira CS Assistant"
    page_icon: str = "🤖"

    # 側邊欄標題
    sidebar_title: str = "對話管理"

    # 問題狀態選項
    status_options: list = None

    # 最大會話歷史顯示數量
    max_history_display: int = 50

    def __post_init__(self):
        if self.status_options is None:
            self.status_options = ["open", "pending", "closed"]


@dataclass
class SessionConfig:
    """會話配置"""
    # 會話存儲位置
    storage_path: str = os.getenv("SESSION_STORAGE_PATH", "./streamlit_client/data/sessions")

    # 是否自動保存會話
    auto_save: bool = True

    # 會話過期時間(天)
    session_expiry_days: int = 30


@dataclass
class DatabaseConfig:
    """資料庫配置"""
    # PostgreSQL 連接字符串
    url: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/jira_cs")

    # 連接池設定
    max_connections: int = int(os.getenv("DATABASE_MAX_CONNECTIONS", "5"))
    idle_timeout: int = int(os.getenv("DATABASE_IDLE_TIMEOUT", "30000"))


class Settings:
    """全局設定類"""

    def __init__(self):
        self.api = APIConfig()
        self.ui = UIConfig()
        self.session = SessionConfig()
        self.database = DatabaseConfig()

    @property
    def backend_url(self) -> str:
        """獲取完整的後端 API URL"""
        return self.api.base_url


# 全局設定實例
settings = Settings()
