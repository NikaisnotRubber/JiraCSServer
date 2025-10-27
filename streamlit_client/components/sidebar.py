"""
側邊欄組件

提供會話管理、系統設置等功能。
"""
import streamlit as st
from services.session_manager import session_manager
from services.checkpoint_service import checkpoint_service
from services.api_client import api_client
from config.settings import settings


def render_session_list():
    """渲染會話列表"""
    st.subheader("📚 會話歷史")

    sessions = session_manager.list_sessions()

    if not sessions:
        st.info("暫無會話記錄")
        return

    # 篩選選項
    status_filter = st.selectbox(
        "篩選狀態",
        ["全部", "open", "pending", "closed"],
        key="status_filter"
    )

    # 應用篩選
    if status_filter != "全部":
        sessions = [s for s in sessions if s["status"] == status_filter]

    # 顯示會話列表
    for session_info in sessions[:settings.ui.max_history_display]:
        with st.container():
            col1, col2 = st.columns([3, 1])

            with col1:
                # 會話標題和狀態
                status_emoji = {
                    "open": "🟢",
                    "pending": "🟡",
                    "closed": "🔴"
                }
                emoji = status_emoji.get(session_info["status"], "⚪")

                # 點擊按鈕加載會話
                if st.button(
                    f"{emoji} {session_info['title']}",
                    key=f"load_{session_info['session_id']}",
                    use_container_width=True
                ):
                    # 加載會話
                    session = session_manager.load_session(session_info["session_id"])
                    if session:
                        st.session_state.current_session = session
                        st.rerun()

            with col2:
                # 刪除按鈕
                if st.button("🗑️", key=f"del_{session_info['session_id']}"):
                    if session_manager.delete_session(session_info["session_id"]):
                        st.success(f"已刪除會話: {session_info['session_id']}")
                        st.rerun()

            # 顯示會話信息
            st.caption(
                f"ID: {session_info['session_id']} | "
                f"訊息: {session_info['message_count']} | "
                f"更新: {session_info['updated_at'][:10]}"
            )

            st.divider()


def render_new_session_form():
    """渲染新會話創建表單"""
    st.subheader("➕ 創建新會話")

    with st.form("new_session_form", clear_on_submit=True):
        project_id = st.text_input(
            "Project ID *",
            placeholder="例如: JCSC-1",
            help="Jira 專案 ID,用於識別和追蹤對話"
        )

        title = st.text_input(
            "會話標題",
            placeholder="例如: 登入問題諮詢",
            help="為此會話設置一個描述性標題"
        )

        status = st.selectbox(
            "初始狀態",
            settings.ui.status_options,
            index=0
        )

        submitted = st.form_submit_button("創建會話", use_container_width=True)

        if submitted:
            if not project_id:
                st.error("Project ID 為必填項!")
            else:
                # 檢查會話是否已存在
                existing_session = session_manager.load_session(project_id)

                if existing_session:
                    st.warning(f"會話 {project_id} 已存在,已自動加載")
                    st.session_state.current_session = existing_session
                else:
                    # 創建新會話
                    session_title = title if title else f"對話 - {project_id}"
                    session = session_manager.create_session(
                        session_id=project_id,
                        title=session_title,
                        status=status
                    )
                    st.session_state.current_session = session
                    st.success(f"✅ 創建會話: {project_id}")

                st.rerun()


def render_session_actions():
    """渲染當前會話操作"""
    if "current_session" not in st.session_state:
        return

    session = st.session_state.current_session

    st.subheader("⚙️ 會話操作")

    # 更新會話狀態
    new_status = st.selectbox(
        "更新狀態",
        settings.ui.status_options,
        index=settings.ui.status_options.index(session.status),
        key="session_status_select"
    )

    if new_status != session.status:
        if st.button("💾 保存狀態", use_container_width=True):
            session_manager.update_session_status(session, new_status)
            st.session_state.current_session.status = new_status
            st.success(f"狀態已更新為: {new_status}")
            st.rerun()

    st.divider()

    # Checkpoint 信息
    checkpoint_count = checkpoint_service.get_checkpoint_count(session.session_id)
    has_checkpoint = checkpoint_service.has_checkpoint(session.session_id)

    st.text(f"🗂️ Checkpoint 數量: {checkpoint_count}")
    st.text(f"📚 LangMem 上下文: {'✅ 已啟用' if has_checkpoint else '❌ 無'}")

    if has_checkpoint:
        st.info("此會話有歷史上下文,後端會自動加載")

    st.divider()

    # 清除對話
    if st.button("🧹 清除對話歷史", use_container_width=True, type="secondary"):
        session.messages = []
        session_manager.save_session(session)
        st.success("對話歷史已清除")
        st.rerun()

    # 刪除會話
    if st.button("🗑️ 刪除會話", use_container_width=True, type="secondary"):
        session_id = session.session_id
        if session_manager.delete_session(session_id):
            # 同時刪除 checkpoint
            checkpoint_service.delete_checkpoint(session_id)
            del st.session_state.current_session
            st.success(f"會話 {session_id} 已刪除")
            st.rerun()


def render_system_status():
    """渲染系統狀態"""
    st.subheader("🖥️ 系統狀態")

    # 檢查後端健康狀態
    health = api_client.check_health()

    if health.get("healthy"):
        st.success("✅ 後端服務正常")

        # 顯示系統信息
        with st.expander("系統信息"):
            data = health.get("data", {})
            st.text(f"狀態: {data.get('status', 'N/A')}")
            st.text(f"運行時間: {data.get('uptime', 0):.2f}s")
    else:
        st.error(f"❌ 後端服務異常: {health.get('error', '未知錯誤')}")

    # Checkpoint 統計
    checkpoint_summary = checkpoint_service.get_checkpoint_summary()

    if checkpoint_summary.get("database_connected"):
        st.success("✅ 資料庫連接正常")

        with st.expander("Checkpoint 統計"):
            st.text(f"總會話數: {checkpoint_summary.get('total_threads', 0)}")
            st.text(f"總 Checkpoints: {checkpoint_summary.get('total_checkpoints', 0)}")

            latest = checkpoint_summary.get('latest_thread')
            if latest:
                st.text(f"最近會話: {latest}")
    else:
        st.warning("⚠️ 資料庫連接失敗")


def render_sidebar():
    """渲染完整側邊欄"""
    with st.sidebar:
        st.title(settings.ui.sidebar_title)

        # 系統狀態
        render_system_status()

        st.divider()

        # 新會話創建
        render_new_session_form()

        st.divider()

        # 當前會話操作
        render_session_actions()

        st.divider()

        # 會話列表
        render_session_list()

        st.divider()

        # 設置
        with st.expander("⚙️ 設置"):
            reporter_name = st.text_input(
                "報告者姓名",
                value=st.session_state.get("reporter_name", "Streamlit User"),
                key="reporter_name_input"
            )
            st.session_state.reporter_name = reporter_name

            st.text(f"後端 URL: {settings.backend_url}")
