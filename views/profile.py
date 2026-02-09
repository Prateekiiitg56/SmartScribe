"""
SmartScribe – Profile Page
Shows user info, editable fields, submission history & progress charts.
"""

import streamlit as st
from auth.auth import is_logged_in, hash_password, verify_password
from database.db import (
    get_user_by_id,
    update_user,
    get_essay_count,
    get_average_scores,
    get_user_essays,
)

_CSS = """
<style>
.profile-header {
    text-align: center;
    padding: 2rem 1rem 1rem;
}
.profile-header .avatar {
    width: 100px; height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg,#4F46E5,#7C3AED);
    color: #fff;
    font-size: 2.5rem;
    line-height: 100px;
    margin: 0 auto 0.75rem;
    font-weight: 700;
}
.profile-header h2 {
    margin: 0; font-weight: 700; color: #1e293b;
}
.profile-header p {
    color: #64748b; font-size: 0.92rem;
}
.profile-stat {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.2rem;
    text-align: center;
}
.profile-stat .num {
    font-size: 1.6rem; font-weight: 800; color: #4F46E5;
}
.profile-stat .lbl {
    font-size: 0.82rem; color: #64748b;
}
</style>
"""


def render_profile_page():
    if not is_logged_in():
        st.warning("Please sign in to view your profile.")
        if st.button("🔑 Go to Login", key="profile_goto_login"):
            st.session_state["current_page"] = "login"
            st.rerun()
        return

    st.markdown(_CSS, unsafe_allow_html=True)

    user_id = st.session_state["user_id"]
    user = get_user_by_id(user_id)
    if not user:
        st.error("User not found.")
        return

    initials = "".join(w[0] for w in (user["full_name"] or user["username"]).split()[:2]).upper()

    # ── Header ───────────────────────────────────────────────────────────────────
    st.markdown(f"""
    <div class="profile-header">
        <div class="avatar">{initials}</div>
        <h2>{user['full_name'] or user['username']}</h2>
        <p>@{user['username']}  ·  {user['email']}</p>
        <p style="font-size:0.8rem;color:#94a3b8;">Member since {user['created_at'][:10]}</p>
    </div>
    """, unsafe_allow_html=True)

    # ── Stats row ────────────────────────────────────────────────────────────────
    essay_count = get_essay_count(user_id)
    avg = get_average_scores(user_id)
    avg_overall  = avg.get("avg_overall", 0) or 0
    avg_grammar  = avg.get("avg_grammar", 0) or 0
    avg_argument = avg.get("avg_argument", 0) or 0

    s1, s2, s3, s4 = st.columns(4)
    for col, (num, lbl) in zip(
        [s1, s2, s3, s4],
        [
            (str(essay_count), "Total Essays"),
            (f"{avg_overall}", "Avg Score"),
            (f"{avg_grammar}", "Avg Grammar"),
            (f"{avg_argument}", "Avg Argument"),
        ],
    ):
        col.markdown(
            f'<div class="profile-stat"><div class="num">{num}</div><div class="lbl">{lbl}</div></div>',
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # ── Tabs: Edit Profile | Change Password | Submission History ────────────────
    tab_edit, tab_pw, tab_history = st.tabs(["✏️ Edit Profile", "🔒 Change Password", "📄 Submission History"])

    # ── Edit Profile ─────────────────────────────────────────────────────────────
    with tab_edit:
        with st.form("edit_profile_form"):
            new_name  = st.text_input("Full Name", value=user["full_name"] or "")
            new_email = st.text_input("Email", value=user["email"])
            new_bio   = st.text_area("Bio", value=user["bio"] or "", placeholder="Tell us about yourself…")
            save = st.form_submit_button("💾  Save Changes", use_container_width=True)

            if save:
                changes = {}
                if new_name.strip() != (user["full_name"] or ""):
                    changes["full_name"] = new_name.strip()
                if new_email.strip() != user["email"]:
                    changes["email"] = new_email.strip()
                if new_bio.strip() != (user["bio"] or ""):
                    changes["bio"] = new_bio.strip()

                if changes:
                    update_user(user_id, **changes)
                    if "full_name" in changes:
                        st.session_state["full_name"] = changes["full_name"]
                    st.success("Profile updated! ✅")
                    st.rerun()
                else:
                    st.info("No changes detected.")

    # ── Change Password ──────────────────────────────────────────────────────────
    with tab_pw:
        with st.form("change_pw_form"):
            cur_pw  = st.text_input("Current Password", type="password")
            new_pw  = st.text_input("New Password", type="password", placeholder="Min 6 characters")
            conf_pw = st.text_input("Confirm New Password", type="password")
            change  = st.form_submit_button("🔒  Update Password", use_container_width=True)

            if change:
                if not all([cur_pw, new_pw, conf_pw]):
                    st.error("Please fill in all fields.")
                elif not verify_password(cur_pw, user["password"]):
                    st.error("Current password is incorrect.")
                elif len(new_pw) < 6:
                    st.error("New password must be at least 6 characters.")
                elif new_pw != conf_pw:
                    st.error("New passwords do not match.")
                else:
                    update_user(user_id, password=hash_password(new_pw))
                    st.success("Password updated successfully! ✅")

    # ── Submission History ───────────────────────────────────────────────────────
    with tab_history:
        essays = get_user_essays(user_id, limit=20)
        if not essays:
            st.info("You haven't submitted any essays yet. Start writing! 📝")
        else:
            # Score-over-time chart
            try:
                import plotly.graph_objects as go

                dates   = [e["submitted_at"][:10] for e in reversed(essays)]
                overall = [e["overall_score"] for e in reversed(essays)]
                grammar = [e["grammar_score"] for e in reversed(essays)]
                coh     = [e["coherence_score"] for e in reversed(essays)]

                fig = go.Figure()
                fig.add_trace(go.Scatter(x=dates, y=overall, mode="lines+markers", name="Overall"))
                fig.add_trace(go.Scatter(x=dates, y=grammar, mode="lines+markers", name="Grammar"))
                fig.add_trace(go.Scatter(x=dates, y=coh,     mode="lines+markers", name="Coherence"))
                fig.update_layout(
                    title="Score Progress Over Time",
                    xaxis_title="Date",
                    yaxis_title="Score (out of 10)",
                    yaxis=dict(range=[0, 10.5]),
                    template="plotly_white",
                    height=350,
                    margin=dict(t=40, b=30),
                )
                st.plotly_chart(fig, use_container_width=True)
            except ImportError:
                st.caption("Install `plotly` for score-progress charts.")

            # Table
            for e in essays:
                with st.expander(
                    f"**{e['title']}**  ·  Overall {e['overall_score']}/10  ·  {e['submitted_at'][:10]}"
                ):
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Grammar",   f"{e['grammar_score']}/10")
                    c2.metric("Coherence", f"{e['coherence_score']}/10")
                    c3.metric("Argument",  f"{e['argument_score']}/10")
                    if e["feedback"]:
                        st.info(e["feedback"])
