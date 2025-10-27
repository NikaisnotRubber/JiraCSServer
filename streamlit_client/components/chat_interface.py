"""
聊天界面組件

提供 Streamlit 聊天 UI 組件。
"""
import streamlit as st
from typing import Optional
from services.api_client import api_client
from services.session_manager import session_manager, Session


def render_message(message):
    """
    渲染單條訊息

    Args:
        message: 訊息對象
    """
    with st.chat_message(message.role):
        st.markdown(message.content)

        # 如果是 assistant 訊息且有元數據,顯示詳細信息
        if message.role == "assistant" and message.metadata:
            with st.expander("📊 詳細信息"):
                metadata = message.metadata

                if "classification" in metadata:
                    classification = metadata["classification"]
                    st.text(f"分類: {classification.get('category', 'N/A')}")
                    if "confidence" in classification:
                        confidence = classification["confidence"]
                        st.progress(confidence, text=f"信心度: {confidence:.1%}")

                if "quality_score" in metadata and metadata["quality_score"]:
                    quality_score = metadata["quality_score"]
                    st.text(f"質量評分: {quality_score:.1%}")

                if "processing_time" in metadata:
                    processing_time = metadata["processing_time"]
                    st.text(f"處理時間: {processing_time}ms")

                if "workflow_id" in metadata:
                    st.text(f"工作流 ID: {metadata['workflow_id']}")


def render_chat_history(session: Session):
    """
    渲染聊天歷史

    Args:
        session: 會話對象
    """
    for message in session.messages:
        render_message(message)


def handle_user_input(session: Session, user_input: str):
    """
    處理用戶輸入

    Args:
        session: 當前會話
        user_input: 用戶輸入內容
    """
    # 添加用戶訊息到會話
    session_manager.add_message(session, "user", user_input)

    # 渲染用戶訊息
    with st.chat_message("user"):
        st.markdown(user_input)

    # 顯示助手正在思考
    with st.chat_message("assistant"):
        with st.spinner("🤔 正在思考..."):
            try:
                # 調用後端 API
                response = api_client.process_issue(
                    project_id=session.session_id,
                    question=user_input,
                    reporter=st.session_state.get("reporter_name", "Streamlit User"),
                    issue_type="Question"
                )

                if response.get("success"):
                    # 提取回答內容
                    answer = response["answer"]

                    # 準備元數據
                    metadata = {
                        "classification": response.get("classification", {}),
                        "quality_score": response.get("quality_score"),
                        "processing_time": response.get("processing_time", 0),
                        "workflow_id": response.get("workflow_id", ""),
                        **response.get("metadata", {})
                    }

                    # 添加助手回應到會話
                    session_manager.add_message(session, "assistant", answer, metadata)

                    # 渲染回應
                    st.markdown(answer)

                    # 顯示詳細信息
                    with st.expander("📊 詳細信息"):
                        classification = response.get("classification", {})
                        if classification:
                            st.text(f"分類: {classification.get('category', 'N/A')}")
                            if "confidence" in classification:
                                confidence = classification["confidence"]
                                st.progress(confidence, text=f"信心度: {confidence:.1%}")

                        quality_score = response.get("quality_score")
                        if quality_score:
                            st.text(f"質量評分: {quality_score:.1%}")

                        processing_time = response.get("processing_time", 0)
                        st.text(f"處理時間: {processing_time}ms")

                        workflow_id = response.get("workflow_id", "")
                        if workflow_id:
                            st.text(f"工作流 ID: {workflow_id}")

                else:
                    # 錯誤處理
                    error_msg = f"❌ 處理失敗: {response.get('error', '未知錯誤')}"
                    st.error(error_msg)

                    # 添加錯誤訊息到會話
                    session_manager.add_message(
                        session,
                        "assistant",
                        error_msg,
                        {"error": response.get("details")}
                    )

            except Exception as e:
                error_msg = f"❌ 發生錯誤: {str(e)}"
                st.error(error_msg)

                # 添加錯誤訊息到會話
                session_manager.add_message(
                    session,
                    "assistant",
                    error_msg,
                    {"error": str(e)}
                )


def render_chat_interface():
    """
    渲染主聊天界面
    """
    # 確保有當前會話
    if "current_session" not in st.session_state:
        st.warning("⚠️ 請先選擇或創建一個會話")
        return

    session = st.session_state.current_session

    # 顯示會話標題和狀態
    col1, col2, col3 = st.columns([3, 1, 1])
    with col1:
        st.subheader(f"💬 {session.title}")
    with col2:
        # 狀態指示器
        status_emoji = {
            "open": "🟢",
            "pending": "🟡",
            "closed": "🔴"
        }
        st.text(f"{status_emoji.get(session.status, '⚪')} {session.status.upper()}")
    with col3:
        st.text(f"ID: {session.session_id}")

    st.divider()

    # 渲染聊天歷史
    render_chat_history(session)

    # 用戶輸入框
    user_input = st.chat_input("請輸入您的問題...")

    if user_input:
        handle_user_input(session, user_input)
        st.rerun()  # 重新渲染頁面以顯示新訊息
