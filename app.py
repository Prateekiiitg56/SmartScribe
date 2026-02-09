"""
SmartScribe – Main Application Entry Point
Run with:  streamlit run app.py
"""

import streamlit as st
from database.db import init_db
from auth.auth import init_session, is_logged_in, logout, render_login_page, render_register_page
from views.home import render_home_page
from views.profile import render_profile_page

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
    /* Hide Streamlit default header/footer */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}

    /* Sidebar polish */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #4F46E5 0%, #7C3AED 100%);
    }
    [data-testid="stSidebar"] * {
        color: #ffffff !important;
    }
    [data-testid="stSidebar"] .stButton > button {
        background: rgba(255,255,255,0.15);
        border: 1px solid rgba(255,255,255,0.3);
        color: #fff !important;
        border-radius: 8px;
        font-weight: 600;
        transition: background 0.2s;
    }
    [data-testid="stSidebar"] .stButton > button:hover {
        background: rgba(255,255,255,0.25);
    }

    /* Card-like containers */
    .block-container {
        padding-top: 1.5rem;
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
    # Placeholder for future essay evaluation page
    st.markdown("## 📝 Essay Evaluation")
    if not is_logged_in():
        st.warning("Please sign in to submit an essay.")
        if st.button("🔑 Go to Login", key="eval_goto_login"):
            st.session_state["current_page"] = "login"
            st.rerun()
    else:
        st.info("🚧 The AI essay evaluation engine is coming soon! This page will let you submit essays and receive instant feedback.")
        with st.form("essay_placeholder"):
            title = st.text_input("Essay Title", placeholder="e.g. The Impact of AI on Education")
            content = st.text_area("Essay Content", height=250, placeholder="Paste or type your essay here…")
            submitted = st.form_submit_button("🔍  Evaluate", use_container_width=True)
            if submitted:
                if not title.strip() or not content.strip():
                    st.error("Please provide both a title and essay content.")
                else:
                    # Placeholder scoring (will be replaced by AI modules)
                    import random
                    from database.db import save_essay
                    g = round(random.uniform(5, 9), 1)
                    c = round(random.uniform(5, 9), 1)
                    a = round(random.uniform(4, 9), 1)
                    o = round((g + c + a) / 3, 1)
                    fb = "This is placeholder feedback. The AI evaluation engine will provide detailed, actionable suggestions here."
                    save_essay(st.session_state["user_id"], title.strip(), content.strip(), g, c, a, o, fb)
                    st.success(f"Essay submitted! Overall score: **{o}/10**")
                    st.balloons()

else:
    render_home_page()
