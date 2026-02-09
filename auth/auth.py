"""
SmartScribe – Authentication module
Handles registration, login, logout, session helpers, and password hashing.
"""

import streamlit as st
import bcrypt
import re
from database.db import create_user, get_user_by_username, get_user_by_email


# ─── Password helpers ───────────────────────────────────────────────────────────
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


# ─── Validation helpers ─────────────────────────────────────────────────────────
def _valid_email(email: str) -> bool:
    return bool(re.match(r"^[\w\.\+\-]+@[\w\-]+\.[a-zA-Z]{2,}$", email))


def _valid_username(username: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9_]{3,20}$", username))


# ─── Session helpers ─────────────────────────────────────────────────────────────
def init_session():
    """Ensure all auth keys exist in session_state."""
    defaults = {
        "authenticated": False,
        "user_id": None,
        "username": None,
        "full_name": None,
        "current_page": "home",
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v


def is_logged_in() -> bool:
    return st.session_state.get("authenticated", False)


def logout():
    for key in ["authenticated", "user_id", "username", "full_name"]:
        st.session_state[key] = None
    st.session_state["authenticated"] = False
    st.session_state["current_page"] = "home"


# ─── UI Components ──────────────────────────────────────────────────────────────
def render_login_page():
    """Render the login form."""
    st.markdown("""
    <style>
    .auth-container {
        max-width: 440px;
        margin: 2rem auto;
        padding: 2.5rem 2rem;
        border-radius: 16px;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .auth-title {
        text-align: center;
        font-size: 1.8rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 0.25rem;
    }
    .auth-subtitle {
        text-align: center;
        color: #64748b;
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
    }
    .auth-divider {
        text-align: center;
        color: #94a3b8;
        font-size: 0.85rem;
        margin: 1rem 0;
    }
    </style>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown('<p class="auth-title">👋 Welcome Back</p>', unsafe_allow_html=True)
        st.markdown('<p class="auth-subtitle">Sign in to continue to SmartScribe</p>', unsafe_allow_html=True)

        with st.form("login_form", clear_on_submit=False):
            username = st.text_input("Username", placeholder="Enter your username")
            password = st.text_input("Password", type="password", placeholder="Enter your password")
            submitted = st.form_submit_button("🔑  Sign In", use_container_width=True)

            if submitted:
                if not username or not password:
                    st.error("Please fill in all fields.")
                    return

                user = get_user_by_username(username.strip())
                if user is None:
                    st.error("Invalid username or password.")
                    return

                if not verify_password(password, user["password"]):
                    st.error("Invalid username or password.")
                    return

                # Success – set session
                st.session_state["authenticated"] = True
                st.session_state["user_id"] = user["id"]
                st.session_state["username"] = user["username"]
                st.session_state["full_name"] = user["full_name"]
                st.session_state["current_page"] = "home"
                st.success(f"Welcome back, {user['full_name'] or user['username']}!")
                st.rerun()

        st.markdown('<p class="auth-divider">Don\'t have an account?</p>', unsafe_allow_html=True)
        if st.button("📝  Create Account", use_container_width=True, key="login_goto_register"):
            st.session_state["current_page"] = "register"
            st.rerun()


def render_register_page():
    """Render the registration form."""
    st.markdown("""
    <style>
    .auth-container {
        max-width: 440px;
        margin: 2rem auto;
        padding: 2.5rem 2rem;
        border-radius: 16px;
        background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .auth-title {
        text-align: center;
        font-size: 1.8rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 0.25rem;
    }
    .auth-subtitle {
        text-align: center;
        color: #64748b;
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
    }
    </style>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown('<p class="auth-title">🚀 Create Account</p>', unsafe_allow_html=True)
        st.markdown('<p class="auth-subtitle">Join SmartScribe and start improving your writing</p>', unsafe_allow_html=True)

        with st.form("register_form", clear_on_submit=False):
            full_name = st.text_input("Full Name")
            username  = st.text_input("Username")
            email     = st.text_input("Email")
            password  = st.text_input("Password")
            confirm   = st.text_input("Confirm Password")
            submitted = st.form_submit_button(" Create Account", use_container_width=True)

            if submitted:
                # ── Validations ──
                if not all([full_name, username, email, password, confirm]):
                    st.error("Please fill in all fields.")
                    return
                if not _valid_username(username.strip()):
                    st.error("Username must be 3-20 chars: letters, digits, or underscores.")
                    return
                if not _valid_email(email.strip()):
                    st.error("Please enter a valid email address.")
                    return
                if len(password) < 6:
                    st.error("Password must be at least 6 characters.")
                    return
                if password != confirm:
                    st.error("Passwords do not match.")
                    return
                if get_user_by_username(username.strip()):
                    st.error("Username already taken.")
                    return
                if get_user_by_email(email.strip()):
                    st.error("An account with that email already exists.")
                    return

                # ── Create user ──
                hashed = hash_password(password)
                uid = create_user(username.strip(), email.strip(), hashed, full_name.strip())

                st.session_state["authenticated"] = True
                st.session_state["user_id"] = uid
                st.session_state["username"] = username.strip()
                st.session_state["full_name"] = full_name.strip()
                st.session_state["current_page"] = "home"
                st.success("Account created successfully! 🎉")
                st.rerun()

        st.markdown('<p style="text-align:center;color:#94a3b8;font-size:0.85rem;margin:1rem 0;">Already have an account?</p>', unsafe_allow_html=True)
        if st.button("🔑  Sign In Instead", use_container_width=True, key="register_goto_login"):
            st.session_state["current_page"] = "login"
            st.rerun()
