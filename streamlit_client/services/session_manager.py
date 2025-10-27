"""
會話管理服務

負責管理用戶的對話會話,包括會話歷史記錄、狀態追蹤等。
"""
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from config.settings import settings


@dataclass
class Message:
    """訊息數據類"""
    role: str  # "user" 或 "assistant"
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Message':
        """從字典創建"""
        return cls(**data)


@dataclass
class Session:
    """會話數據類"""
    session_id: str  # 對應 Project ID
    title: str
    status: str  # "open", "pending", "closed"
    created_at: str
    updated_at: str
    messages: List[Message]
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        data = asdict(self)
        data["messages"] = [msg.to_dict() for msg in self.messages]
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Session':
        """從字典創建"""
        messages = [Message.from_dict(msg) for msg in data.get("messages", [])]
        data["messages"] = messages
        return cls(**data)


class SessionManager:
    """
    會話管理器

    負責:
    - 創建和加載會話
    - 保存會話歷史
    - 管理會話狀態
    - 檢索歷史會話
    """

    def __init__(self):
        self.storage_path = settings.session.storage_path
        self._ensure_storage_dir()

    def _ensure_storage_dir(self):
        """確保存儲目錄存在"""
        os.makedirs(self.storage_path, exist_ok=True)

    def _get_session_file_path(self, session_id: str) -> str:
        """獲取會話文件路徑"""
        return os.path.join(self.storage_path, f"{session_id}.json")

    def create_session(
        self,
        session_id: str,
        title: str = "新對話",
        status: str = "open"
    ) -> Session:
        """
        創建新會話

        Args:
            session_id: 會話 ID (通常使用 Project ID)
            title: 會話標題
            status: 會話狀態

        Returns:
            新創建的會話對象
        """
        now = datetime.now().isoformat()

        session = Session(
            session_id=session_id,
            title=title,
            status=status,
            created_at=now,
            updated_at=now,
            messages=[],
            metadata={}
        )

        self.save_session(session)
        print(f"✅ 創建新會話: {session_id}")
        return session

    def load_session(self, session_id: str) -> Optional[Session]:
        """
        加載會話

        Args:
            session_id: 會話 ID

        Returns:
            會話對象,如果不存在則返回 None
        """
        file_path = self._get_session_file_path(session_id)

        if not os.path.exists(file_path):
            return None

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            session = Session.from_dict(data)
            print(f"📚 加載會話: {session_id}")
            return session
        except Exception as e:
            print(f"❌ 加載會話失敗: {e}")
            return None

    def save_session(self, session: Session):
        """
        保存會話

        Args:
            session: 會話對象
        """
        session.updated_at = datetime.now().isoformat()
        file_path = self._get_session_file_path(session.session_id)

        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(session.to_dict(), f, ensure_ascii=False, indent=2)
            print(f"💾 保存會話: {session.session_id}")
        except Exception as e:
            print(f"❌ 保存會話失敗: {e}")

    def add_message(
        self,
        session: Session,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Session:
        """
        添加訊息到會話

        Args:
            session: 會話對象
            role: 角色 ("user" 或 "assistant")
            content: 訊息內容
            metadata: 訊息元數據

        Returns:
            更新後的會話對象
        """
        message = Message(
            role=role,
            content=content,
            timestamp=datetime.now().isoformat(),
            metadata=metadata
        )

        session.messages.append(message)

        if settings.session.auto_save:
            self.save_session(session)

        return session

    def update_session_status(self, session: Session, status: str) -> Session:
        """
        更新會話狀態

        Args:
            session: 會話對象
            status: 新狀態 ("open", "pending", "closed")

        Returns:
            更新後的會話對象
        """
        session.status = status

        if settings.session.auto_save:
            self.save_session(session)

        print(f"📝 更新會話狀態: {session.session_id} -> {status}")
        return session

    def list_sessions(self) -> List[Dict[str, Any]]:
        """
        列出所有會話

        Returns:
            會話信息列表
        """
        sessions = []

        if not os.path.exists(self.storage_path):
            return sessions

        for filename in os.listdir(self.storage_path):
            if filename.endswith('.json'):
                session_id = filename[:-5]  # 移除 .json 擴展名
                session = self.load_session(session_id)

                if session:
                    sessions.append({
                        "session_id": session.session_id,
                        "title": session.title,
                        "status": session.status,
                        "created_at": session.created_at,
                        "updated_at": session.updated_at,
                        "message_count": len(session.messages)
                    })

        # 按更新時間排序(最新的在前)
        sessions.sort(key=lambda x: x["updated_at"], reverse=True)

        return sessions

    def delete_session(self, session_id: str) -> bool:
        """
        刪除會話

        Args:
            session_id: 會話 ID

        Returns:
            是否刪除成功
        """
        file_path = self._get_session_file_path(session_id)

        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"🗑️ 刪除會話: {session_id}")
                return True
            except Exception as e:
                print(f"❌ 刪除會話失敗: {e}")
                return False

        return False

    def cleanup_old_sessions(self, days: int = None):
        """
        清理過期會話

        Args:
            days: 保留最近多少天的會話(默認使用配置值)
        """
        if days is None:
            days = settings.session.session_expiry_days

        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_count = 0

        for session_info in self.list_sessions():
            updated_at = datetime.fromisoformat(session_info["updated_at"])

            if updated_at < cutoff_date:
                if self.delete_session(session_info["session_id"]):
                    deleted_count += 1

        print(f"🧹 清理了 {deleted_count} 個過期會話")


# 全局會話管理器實例
session_manager = SessionManager()
