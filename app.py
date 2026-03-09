"""
SmartScribe – Main Application Entry Point
Run with:  streamlit run app.py
"""

import streamlit as st
from database.db import init_db
from auth.auth import init_session, is_logged_in, logout, render_login_page, render_register_page
from views.home import render_home_page
from views.profile import render_profile_page
from views.evaluate import render_evaluate_page

# ─── Page configuration ─────────────────────────────────────────────────────────
st.set_page_config(
    page_title="SmartScribe – AI Essay Evaluator",
    page_icon="✍️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── One-time setup ─────────────────────────────────────────────────────────────
init_db()
init_session()

# ─── Global CSS overrides ───────────────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Outfit:wght@600;700&family=Roboto+Mono:wght@500&display=swap');

    html, body, [class*="css"]  {
        font-family: 'Inter', sans-serif;
    }
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Outfit', sans-serif !important;
    }

    /* Hide Streamlit default header/footer */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* Main background */
    .stApp {
        background-color: #05050A;
        background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
        background-size: 24px 24px;
    }

    /* Sidebar polish */
    [data-testid="stSidebar"] {
        background: #0A0A12 !important;
        border-right: 1px solid rgba(79,70,229,0.13) !important;
    }
    
    [data-testid="stSidebar"] * {
        color: #F3F3F5 !important;
    }
    
    [data-testid="stSidebar"] hr {
        border-top: 1px solid rgba(79,70,229,0.13) !important;
    }

    [data-testid="stSidebar"] .stButton > button {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(79,70,229,0.3);
        color: #F3F3F5 !important;
        border-radius: 4px;
        font-weight: 500;
        font-family: 'Roboto Mono', monospace;
        letter-spacing: 0.5px;
        transition: all 0.3s ease;
    }
    
    [data-testid="stSidebar"] .stButton > button:hover {
        border-color: #4F46E5;
        box-shadow: 0 0 20px rgba(79,70,229,0.4);
        background: transparent;
    }

    /* Card-like containers focus */
    .block-container {
        padding-top: 2rem;
        max-width: 1200px;
    }
    
    /* Global Buttons */
    .stButton > button {
        font-family: 'Roboto Mono', monospace;
        letter-spacing: 0.5px;
        border-radius: 4px !important;
        transition: all 0.3s ease !important;
    }
</style>
""", unsafe_allow_html=True)


# ─── Sidebar Navigation ─────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## ✍️ SmartScribe")
    st.markdown("---")

    if is_logged_in():
        st.markdown(f"**👤 {st.session_state.get('full_name') or st.session_state.get('username', 'User')}**")
        st.caption(f"@{st.session_state.get('username', '')}")
        st.markdown("")

        if st.button("🏠  Home", use_container_width=True, key="sb_home_auth"):
            st.session_state["current_page"] = "home"
            st.rerun()

        if st.button("📝  Evaluate Essay", use_container_width=True, key="sb_evaluate"):
            st.session_state["current_page"] = "evaluate"
            st.rerun()

        if st.button("👤  Profile", use_container_width=True, key="sb_profile"):
            st.session_state["current_page"] = "profile"
            st.rerun()

        st.markdown("---")
        if st.button("🚪  Logout", use_container_width=True, key="sb_logout"):
            logout()
            st.rerun()
    else:
        if st.button("🏠  Home", use_container_width=True, key="sb_home_guest"):
            st.session_state["current_page"] = "home"
            st.rerun()

        if st.button("🔑  Sign In", use_container_width=True, key="sb_signin"):
            st.session_state["current_page"] = "login"
            st.rerun()

        if st.button("📝  Register", use_container_width=True, key="sb_register"):
            st.session_state["current_page"] = "register"
            st.rerun()

    # Guard: redirect profile access for guests
    if not is_logged_in() and st.session_state.get("current_page") == "profile":
        st.session_state["current_page"] = "login"
        st.rerun()

    st.markdown("---")
    st.caption("© 2026 SmartScribe")


# ─── Page Router ─────────────────────────────────────────────────────────────────
page = st.session_state.get("current_page", "home")

if page == "home":
    render_home_page()

elif page == "login":
    render_login_page()

elif page == "register":
    render_register_page()

elif page == "profile":
    render_profile_page()

elif page == "evaluate":
    render_evaluate_page()

else:
    render_home_page()
