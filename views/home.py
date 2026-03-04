"""
SmartScribe – Home Page
Renders the landing / dashboard page depending on auth state.
"""

import streamlit as st
from auth.auth import is_logged_in


# ─── CSS shared by both views ───────────────────────────────────────────────────
_COMMON_CSS = """
<style>
/* ── Variables ── */
:root {
    --bg-base: #05050A;
    --bg-alt: #0A0A12;
    --accent-primary: #4F46E5;
    --accent-secondary: #7C3AED;
    --text-primary: #F3F3F5;
    --text-muted: #838590;
    --glass-bg: rgba(255,255,255,0.04);
    --glass-border: rgba(79,70,229,0.13);
    
    --glow-sm: 0 0 20px rgba(79,70,229,0.4);
    --glow-md: 0 0 40px rgba(79,70,229,0.3);
}

/* ── Hero ────────────────────────── */
.hero {
    text-align: center;
    padding: 3rem 1rem 2rem;
}
.hero h1 {
    font-size: 3.5rem;
    font-weight: 700;
    letter-spacing: -1.5px;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
}
.hero h1 span {
    color: var(--accent-primary);
    text-shadow: var(--glow-sm);
}
.hero .tagline {
    font-size: 1.15rem;
    color: var(--text-muted);
    max-width: 600px;
    margin: 0 auto 2rem;
    line-height: 1.6;
}

/* ── Feature cards ───────────────── */
.feature-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 2rem 1.5rem;
    text-align: left;
    backdrop-filter: blur(8px);
    transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1), box-shadow 0.4s;
    height: 100%;
}
.feature-card:hover {
    transform: translateY(-8px);
    border-color: rgba(79,70,229,0.4);
    box-shadow: var(--glow-md);
}
.feature-icon {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--accent-primary);
    text-shadow: var(--glow-sm);
}
.feature-card h3 {
    font-size: 1.1rem;
    color: var(--text-primary);
    margin-bottom: 0.8rem;
    font-family: 'Outfit', sans-serif;
}
.feature-card p {
    font-size: 0.95rem;
    color: var(--text-muted);
    line-height: 1.6;
}

/* ── How-it-works steps ──────────── */
.step-badge {
    display: inline-block;
    font-family: 'Roboto Mono', monospace;
    font-size: 4rem;
    font-weight: 700;
    color: var(--accent-secondary);
    opacity: 0.2;
    margin-bottom: -15px;
    line-height: 1;
}
.step-title {
    font-weight: 600;
    font-size: 1.1rem;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}
.step-desc {
    font-size: 0.95rem;
    color: var(--text-muted);
}

/* ── Stats row ───────────────────── */
.stat-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 1.4rem;
    text-align: center;
    backdrop-filter: blur(8px);
}
.stat-card .num {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    font-family: 'Roboto Mono', monospace;
}
.stat-card .label {
    font-size: 0.85rem;
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* section header */
.section-header {
    text-align: center;
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 3.5rem 0 1rem;
    font-family: 'Outfit', sans-serif;
}
.section-sub {
    text-align: center;
    color: var(--text-muted);
    font-size: 1.1rem;
    margin-bottom: 2.5rem;
}

/* stMetric Override (for Dashboard) */
div[data-testid="stMetricValue"] {
    font-family: 'Roboto Mono', monospace;
    color: #4F46E5 !important;
    text-shadow: 0 0 10px rgba(79,70,229,0.3);
}
div[data-testid="stMetricLabel"] {
    color: #838590 !important;
}

/* Expander styling */
.streamlit-expanderHeader {
    background-color: rgba(255,255,255,0.02) !important;
    border: 1px solid rgba(79,70,229,0.13) !important;
    border-radius: 8px !important;
    color: #F3F3F5 !important;
}
</style>
"""


# ─── Landing page (unauthenticated) ─────────────────────────────────────────────
def _render_landing():
    st.markdown(_COMMON_CSS, unsafe_allow_html=True)

    # Hero
    st.markdown("""
    <div class="hero">
        <h1>✍️ SmartScribe</h1>
        <p class="tagline">
            AI-powered essay evaluation that gives you instant scores, actionable feedback,
            and personalized improvement plans — so every draft is better than the last.
        </p>
    </div>
    """, unsafe_allow_html=True)

    # CTA buttons
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        col_a, col_b = st.columns(2)
        with col_a:
            if st.button("🚀  Get Started Free", use_container_width=True, key="home_get_started"):
                st.session_state["current_page"] = "register"
                st.rerun()
        with col_b:
            if st.button("🔑  Sign In", use_container_width=True, key="home_signin"):
                st.session_state["current_page"] = "login"
                st.rerun()

    # Stats
    st.markdown("")
    s1, s2, s3, s4 = st.columns(4)
    stats = [
        ("10K+", "Essays Evaluated"),
        ("95%", "User Satisfaction"),
        ("< 5s", "Avg Response Time"),
        ("6", "Scoring Dimensions"),
    ]
    for col, (num, label) in zip([s1, s2, s3, s4], stats):
        col.markdown(f'<div class="stat-card"><div class="num">{num}</div><div class="label">{label}</div></div>', unsafe_allow_html=True)

    # Features
    st.markdown('<p class="section-header">✨ Powerful Features</p>', unsafe_allow_html=True)
    st.markdown('<p class="section-sub">Everything you need to write better essays</p>', unsafe_allow_html=True)

    features = [
        ("📝", "Grammar Analysis", "Deep NLP checks for spelling, punctuation, and sentence structure errors."),
        ("🔗", "Coherence Scoring", "Measures logical flow, paragraph transitions, and overall readability."),
        ("💡", "Argument Evaluation", "Analyzes thesis strength, evidence quality, and reasoning depth."),
        ("📊", "Rubric-Based Scoring", "Multi-dimensional scoring aligned with academic rubrics."),
        ("🎯", "Smart Feedback", "Actionable, section-level suggestions to improve your writing."),
        ("📈", "Progress Tracking", "Compare submissions over time and visualize your improvement."),
    ]

    rows = [features[i:i + 3] for i in range(0, len(features), 3)]
    for row in rows:
        cols = st.columns(3)
        for col, (icon, title, desc) in zip(cols, row):
            col.markdown(f"""
            <div class="feature-card">
                <div class="feature-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
            </div>
            """, unsafe_allow_html=True)

    # How it works
    st.markdown('<p class="section-header">🛠️ How It Works</p>', unsafe_allow_html=True)
    st.markdown('<p class="section-sub">Three simple steps to better writing</p>', unsafe_allow_html=True)

    h1, h2, h3 = st.columns(3)
    steps = [
        (h1, "1", "Submit Your Essay", "Paste or type your essay text into the editor."),
        (h2, "2", "AI Evaluates It", "Our NLP engine scores grammar, coherence, and arguments in seconds."),
        (h3, "3", "Get Feedback & Improve", "Read clear suggestions, revise, and watch your scores climb."),
    ]
    for col, num, title, desc in steps:
        col.markdown(f"""
        <div style="text-align:center;padding:1rem;">
            <div class="step-badge">{num}</div>
            <div class="step-title">{title}</div>
            <div class="step-desc">{desc}</div>
        </div>
        """, unsafe_allow_html=True)

    # Footer
    st.markdown("---")
    st.markdown(
        '<p style="text-align:center;color:#94a3b8;font-size:0.82rem;">'
        '© 2026 SmartScribe · Built with ❤️ for better writing'
        '</p>',
        unsafe_allow_html=True,
    )


# ─── Dashboard page (authenticated) ─────────────────────────────────────────────
def _render_dashboard():
    from database.db import get_essay_count, get_average_scores, get_user_essays

    st.markdown(_COMMON_CSS, unsafe_allow_html=True)

    user_id = st.session_state["user_id"]
    name = st.session_state.get("full_name") or st.session_state.get("username", "User")

    st.markdown(f"""
    <div class="hero" style="padding-bottom:1rem;">
        <h1>Welcome back, {name}! 👋</h1>
        <p class="tagline">Here's a quick overview of your writing journey.</p>
    </div>
    """, unsafe_allow_html=True)

    # Quick-action buttons
    c1, c2, c3 = st.columns([1, 2, 1])
    with c2:
        ca, cb = st.columns(2)
        with ca:
            if st.button("📝  New Essay", use_container_width=True, key="dash_new_essay"):
                st.session_state["current_page"] = "evaluate"
                st.rerun()
        with cb:
            if st.button("👤  My Profile", use_container_width=True, key="dash_profile"):
                st.session_state["current_page"] = "profile"
                st.rerun()

    # Stat cards
    essay_count = get_essay_count(user_id)
    avg = get_average_scores(user_id)
    avg_overall   = avg.get("avg_overall", 0) or 0
    avg_grammar   = avg.get("avg_grammar", 0) or 0
    avg_coherence = avg.get("avg_coherence", 0) or 0
    avg_argument  = avg.get("avg_argument", 0) or 0

    st.markdown("")
    s1, s2, s3, s4 = st.columns(4)
    for col, (num, lbl) in zip(
        [s1, s2, s3, s4],
        [
            (str(essay_count), "Essays Submitted"),
            (f"{avg_overall}/10", "Avg Overall Score"),
            (f"{avg_grammar}/10", "Avg Grammar"),
            (f"{avg_coherence}/10", "Avg Coherence"),
        ],
    ):
        col.markdown(f'<div class="stat-card"><div class="num">{num}</div><div class="label">{lbl}</div></div>', unsafe_allow_html=True)

    # Recent submissions
    st.markdown('<p class="section-header">📄 Recent Submissions</p>', unsafe_allow_html=True)
    essays = get_user_essays(user_id, limit=5)
    if essays:
        for e in essays:
            with st.expander(f"**{e['title']}**  ·  Overall: {e['overall_score']}/10  ·  {e['submitted_at'][:10]}"):
                mc1, mc2, mc3 = st.columns(3)
                mc1.metric("Grammar", f"{e['grammar_score']}/10")
                mc2.metric("Coherence", f"{e['coherence_score']}/10")
                mc3.metric("Argument", f"{e['argument_score']}/10")
                if e["feedback"]:
                    st.info(e["feedback"])
                st.text_area("Essay Text", e["content"], height=120, disabled=True, key=f"essay_{e['id']}")
    else:
        st.info("No essays yet. Submit your first essay to get started! 🚀")


# ─── Public entry point ─────────────────────────────────────────────────────────
def render_home_page():
    if is_logged_in():
        _render_dashboard()
    else:
        _render_landing()
