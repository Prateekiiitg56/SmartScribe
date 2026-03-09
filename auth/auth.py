"""
SmartScribe – Authentication module
Handles registration, login, logout, session helpers, and password hashing.
"""

import streamlit as st
import bcrypt
import re
import urllib.parse
import urllib.request
import json
import base64
import uuid
import time
from database.db import create_user, get_user_by_username, get_user_by_email, get_user_by_id


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


def _valid_password(password: str) -> bool:
    """Check if password meets minimum security requirements: 8+ chars, uppercase, lowercase, digit, special char."""
    if len(password) < 8: return False
    if not re.search(r"[A-Z]", password): return False
    if not re.search(r"[a-z]", password): return False
    if not re.search(r"\d", password): return False
    if not re.search(r"[\W_]", password): return False
    return True


# ─── Google OAuth Helpers ────────────────────────────────────────────────────────
def get_google_auth_url() -> str:
    client_id = st.secrets.get("GOOGLE_CLIENT_ID", "")
    redirect_uri = st.secrets.get("GOOGLE_REDIRECT_URI", "http://localhost:8501")
    if not client_id:
        return "#"
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account"
    }
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)


def handle_google_oauth():
    """Check for Google OAuth code in URL and handle login/registration."""
    if "code" in st.query_params:
        code = st.query_params["code"]
        st.query_params.clear()
        
        client_id = st.secrets.get("GOOGLE_CLIENT_ID", "")
        client_secret = st.secrets.get("GOOGLE_CLIENT_SECRET", "")
        redirect_uri = st.secrets.get("GOOGLE_REDIRECT_URI", "http://localhost:8501")
        
        if not client_id or not client_secret:
            st.error("Google OAuth is not properly configured. Missing secrets.")
            return
        
        token_url = "https://oauth2.googleapis.com/token"
        data = urllib.parse.urlencode({
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }).encode("utf-8")
        
        req = urllib.request.Request(token_url, data=data)
        try:
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode())
                id_token = res_data.get("id_token")
                if not id_token:
                    st.error("Google authentication failed. No ID token received.")
                    return
                
                parts = id_token.split(".")
                if len(parts) != 3:
                    st.error("Invalid ID token received.")
                    return
                
                payload = parts[1]
                payload += "=" * ((4 - len(payload) % 4) % 4)
                decoded = base64.urlsafe_b64decode(payload).decode("utf-8")
                user_info = json.loads(decoded)
                
                email = user_info.get("email")
                full_name = user_info.get("name", "Google User")
                
                if not email:
                    st.error("Google didn't return an email address.")
                    return
                
                user = get_user_by_email(email)
                if not user:
                    # Register the Google user
                    username = "g_" + uuid.uuid4().hex[:12]
                    random_pw = uuid.uuid4().hex + "A1!"
                    hashed = hash_password(random_pw)
                    uid = create_user(username, email, hashed, full_name)
                    user = get_user_by_id(uid)
                    
                st.session_state["authenticated"] = True
                st.session_state["user_id"] = user["id"]
                st.session_state["username"] = user["username"]
                st.session_state["full_name"] = user["full_name"]
                st.session_state["current_page"] = "home"
                st.toast(f"Signed in via Google successfully!", icon="🌐")
                st.rerun()
                
        except Exception as e:
            st.error(f"Failed to authenticate with Google.")


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
            
    handle_google_oauth()


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
        border-radius: 12px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(79,70,229,0.13);
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    }
    .auth-title {
        text-align: center;
        font-size: 2rem;
        font-weight: 700;
        color: #F3F3F5;
        font-family: 'Outfit', sans-serif;
        margin-bottom: 0.25rem;
    }
    .auth-subtitle {
        text-align: center;
        color: #838590;
        margin-bottom: 1.5rem;
        font-size: 0.95rem;
    }
    .auth-divider {
        text-align: center;
        color: #838590;
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
                    time.sleep(1) # secure delay
                    st.error("Please fill in all fields.")
                    return

                user = get_user_by_username(username.strip())
                if user is None:
                    time.sleep(1) # secure delay
                    st.error("Invalid username or password.")
                    return

                if not verify_password(password, user["password"]):
                    time.sleep(1) # secure delay
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

        st.markdown('<p class="auth-divider">Or continue with</p>', unsafe_allow_html=True)
        g_url = get_google_auth_url()
        st.markdown(f'<a href="{g_url}" target="_self" style="display:block; text-align:center; padding:8px; border-radius:4px; border: 1px solid rgba(79,70,229,0.3); color:#F3F3F5; text-decoration:none; font-family:\'Roboto Mono\', monospace; margin-bottom: 2rem;">🌐 Sign in with Google</a>', unsafe_allow_html=True)

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
        border-radius: 12px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(79,70,229,0.13);
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 24px rgba(0,0,0,0.2);
    }
    .auth-title {
        text-align: center;
        font-size: 2rem;
        font-weight: 700;
        color: #F3F3F5;
        font-family: 'Outfit', sans-serif;
        margin-bottom: 0.25rem;
    }
    .auth-subtitle {
        text-align: center;
        color: #838590;
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
                if not _valid_password(password):
                    st.error("Password must be at least 8 chars and include an uppercase, lowercase, digit, and special character.")
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

        st.markdown('<p class="auth-divider" style="margin-top: 1.5rem;">Or continue with</p>', unsafe_allow_html=True)
        g_url = get_google_auth_url()
        st.markdown(f'<a href="{g_url}" target="_self" style="display:block; text-align:center; padding:8px; border-radius:4px; border: 1px solid rgba(79,70,229,0.3); color:#F3F3F5; text-decoration:none; font-family:\'Roboto Mono\', monospace; margin-bottom: 2rem;">🌐 Sign in with Google</a>', unsafe_allow_html=True)

        st.markdown('<p style="text-align:center;color:#94a3b8;font-size:0.85rem;margin:1rem 0;">Already have an account?</p>', unsafe_allow_html=True)
        if st.button("🔑  Sign In Instead", use_container_width=True, key="register_goto_login"):
            st.session_state["current_page"] = "login"
            st.rerun()
