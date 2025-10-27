"""
Checkpoint 服務

與後端 LangMem checkpoint 系統整合,提供對話上下文持久化功能。
"""
import psycopg2
from typing import List, Dict, Any, Optional
from datetime import datetime
from config.settings import settings


class CheckpointService:
    """
    Checkpoint 服務類

    與 PostgreSQL 中的 LangGraph checkpoint 表進行交互,
    實現會話檢索和上下文管理功能。
    """

    def __init__(self):
        self.db_url = settings.database.url

    def _get_connection(self):
        """獲取資料庫連接"""
        try:
            return psycopg2.connect(self.db_url)
        except Exception as e:
            print(f"❌ 資料庫連接失敗: {e}")
            return None

    def get_thread_id(self, project_id: str) -> str:
        """
        從 Project ID 生成 thread_id

        Args:
            project_id: Jira Project ID (例如: "JCSC-1")

        Returns:
            Thread ID (格式: "project:JCSC-1")
        """
        return f"project:{project_id}"

    def has_checkpoint(self, project_id: str) -> bool:
        """
        檢查指定 Project ID 是否有 checkpoint

        Args:
            project_id: Jira Project ID

        Returns:
            是否存在 checkpoint
        """
        conn = self._get_connection()
        if not conn:
            return False

        try:
            thread_id = self.get_thread_id(project_id)

            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT COUNT(*) FROM checkpoints
                    WHERE thread_id = %s
                    """,
                    (thread_id,)
                )
                count = cursor.fetchone()[0]
                return count > 0

        except Exception as e:
            print(f"❌ 檢查 checkpoint 失敗: {e}")
            return False
        finally:
            conn.close()

    def list_checkpoints(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        列出所有 checkpoint (按更新時間排序)

        Args:
            limit: 最大返回數量

        Returns:
            Checkpoint 信息列表
        """
        conn = self._get_connection()
        if not conn:
            return []

        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT DISTINCT ON (thread_id)
                        thread_id,
                        checkpoint_id,
                        parent_checkpoint_id,
                        checkpoint
                    FROM checkpoints
                    ORDER BY thread_id, checkpoint_id DESC
                    LIMIT %s
                    """,
                    (limit,)
                )

                checkpoints = []
                for row in cursor.fetchall():
                    thread_id, checkpoint_id, parent_id, checkpoint_data = row

                    # 提取 Project ID (移除 "project:" 前綴)
                    project_id = thread_id.replace("project:", "")

                    checkpoints.append({
                        "project_id": project_id,
                        "thread_id": thread_id,
                        "checkpoint_id": checkpoint_id,
                        "parent_checkpoint_id": parent_id,
                        "has_context": True
                    })

                return checkpoints

        except Exception as e:
            print(f"❌ 列出 checkpoints 失敗: {e}")
            return []
        finally:
            conn.close()

    def get_checkpoint_count(self, project_id: str) -> int:
        """
        獲取指定 Project ID 的 checkpoint 數量

        Args:
            project_id: Jira Project ID

        Returns:
            Checkpoint 數量
        """
        conn = self._get_connection()
        if not conn:
            return 0

        try:
            thread_id = self.get_thread_id(project_id)

            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT COUNT(*) FROM checkpoints
                    WHERE thread_id = %s
                    """,
                    (thread_id,)
                )
                return cursor.fetchone()[0]

        except Exception as e:
            print(f"❌ 獲取 checkpoint 數量失敗: {e}")
            return 0
        finally:
            conn.close()

    def delete_checkpoint(self, project_id: str) -> bool:
        """
        刪除指定 Project ID 的所有 checkpoints

        Args:
            project_id: Jira Project ID

        Returns:
            是否刪除成功
        """
        conn = self._get_connection()
        if not conn:
            return False

        try:
            thread_id = self.get_thread_id(project_id)

            with conn.cursor() as cursor:
                # 刪除 checkpoints
                cursor.execute(
                    "DELETE FROM checkpoints WHERE thread_id = %s",
                    (thread_id,)
                )

                # 刪除 checkpoint_writes (如果存在)
                cursor.execute(
                    "DELETE FROM checkpoint_writes WHERE thread_id = %s",
                    (thread_id,)
                )

                conn.commit()
                print(f"🗑️ 刪除 checkpoint: {project_id}")
                return True

        except Exception as e:
            print(f"❌ 刪除 checkpoint 失敗: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()

    def get_checkpoint_summary(self) -> Dict[str, Any]:
        """
        獲取 checkpoint 系統摘要統計

        Returns:
            統計信息字典
        """
        conn = self._get_connection()
        if not conn:
            return {"error": "無法連接資料庫"}

        try:
            with conn.cursor() as cursor:
                # 總 thread 數量
                cursor.execute("SELECT COUNT(DISTINCT thread_id) FROM checkpoints")
                total_threads = cursor.fetchone()[0]

                # 總 checkpoint 數量
                cursor.execute("SELECT COUNT(*) FROM checkpoints")
                total_checkpoints = cursor.fetchone()[0]

                # 最近更新的 thread
                cursor.execute(
                    """
                    SELECT thread_id, MAX(checkpoint_id) as latest_checkpoint
                    FROM checkpoints
                    GROUP BY thread_id
                    ORDER BY latest_checkpoint DESC
                    LIMIT 1
                    """
                )
                latest = cursor.fetchone()
                latest_thread = latest[0] if latest else None

                return {
                    "total_threads": total_threads,
                    "total_checkpoints": total_checkpoints,
                    "latest_thread": latest_thread.replace("project:", "") if latest_thread else None,
                    "database_connected": True
                }

        except Exception as e:
            print(f"❌ 獲取統計失敗: {e}")
            return {"error": str(e), "database_connected": False}
        finally:
            conn.close()


# 全局 checkpoint 服務實例
checkpoint_service = CheckpointService()
