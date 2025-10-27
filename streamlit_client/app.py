"""
Jira CS Assistant - Streamlit 客戶端主程序

這是 Jira 客戶服務助手的 Streamlit 前端界面,
整合後端 LangGraph 工作流和 LangMem checkpoint 系統。

功能特性:
1. 基礎聊天機器人功能
2. 會話歷史查看和恢復
3. 問題狀態記錄(open, pending, closed)
4. LangMem checkpoint 整合(自動上下文持久化)
"""
import streamlit as st
import sys
import os

# 添加當前目錄到 Python 路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import settings
from components.sidebar import render_sidebar
from components.chat_interface import render_chat_interface


def init_page_config():
    """初始化頁面配置"""
    st.set_page_config(
        page_title=settings.ui.page_title,
        page_icon=settings.ui.page_icon,
        layout="wide",
        initial_sidebar_state="expanded"
    )


def init_session_state():
    """初始化 Session State"""
    # 報告者姓名
    if "reporter_name" not in st.session_state:
        st.session_state.reporter_name = "Streamlit User"


def render_header():
    """渲染頁面標題"""
    st.title(f"{settings.ui.page_icon} Jira CS Assistant")
    st.caption("基於 LangGraph + LangMem 的智能客服系統")


def render_welcome_message():
    """渲染歡迎訊息(當沒有活動會話時)"""
    st.info("👋 歡迎使用 Jira CS Assistant!")

    st.markdown("""
    ### 🚀 快速開始

    1. **創建新會話** - 在左側邊欄中輸入 Project ID 創建新會話
    2. **加載歷史會話** - 在會話歷史列表中選擇已有的會話
    3. **開始對話** - 在聊天框中輸入您的問題

    ### ✨ 功能特性

    - **智能客服** - 基於 LangGraph 的多 Agent 工作流
    - **上下文記憶** - 使用 LangMem 自動保存和恢復對話上下文
    - **會話管理** - 支持多個會話的創建、查看和管理
    - **狀態追蹤** - 追蹤問題狀態(open/pending/closed)
    - **詳細分析** - 顯示分類信心度、質量評分等元數據

    ### 📚 系統架構

    - **前端**: Streamlit (本客戶端)
    - **後端**: Next.js + TypeScript + LangGraph
    - **AI**: OpenAI GPT-4o
    - **資料庫**: PostgreSQL + LangMem Checkpoints
    - **上下文**: 自動持久化,無需手動配置

    ---

    **請從左側邊欄開始創建或選擇一個會話** 👈
    """)


def main():
    """主程序入口"""
    # 初始化頁面配置
    init_page_config()

    # 初始化 Session State
    init_session_state()

    # 渲染側邊欄
    render_sidebar()

    # 渲染主內容區
    render_header()

    st.divider()

    # 檢查是否有活動會話
    if "current_session" in st.session_state:
        # 渲染聊天界面
        render_chat_interface()
    else:
        # 渲染歡迎訊息
        render_welcome_message()


if __name__ == "__main__":
    main()
