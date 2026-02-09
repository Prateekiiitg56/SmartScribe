"""
SmartScribe – Database layer (SQLite)
Handles all DB creation, user CRUD, and essay-submission CRUD.
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "smartscribe.db")


# ─── helpers ────────────────────────────────────────────────────────────────────
def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row          # dict-like access
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables if they don't exist yet."""
    conn = _get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            username    TEXT    NOT NULL UNIQUE,
            email       TEXT    NOT NULL UNIQUE,
            password    TEXT    NOT NULL,
            full_name   TEXT    DEFAULT '',
            bio         TEXT    DEFAULT '',
            avatar_url  TEXT    DEFAULT '',
            created_at  TEXT    DEFAULT (datetime('now')),
            updated_at  TEXT    DEFAULT (datetime('now'))
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS essays (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL,
            title           TEXT    DEFAULT 'Untitled Essay',
            content         TEXT    NOT NULL,
            grammar_score   REAL    DEFAULT 0,
            coherence_score REAL    DEFAULT 0,
            argument_score  REAL    DEFAULT 0,
            overall_score   REAL    DEFAULT 0,
            feedback        TEXT    DEFAULT '',
            submitted_at    TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


# ─── User operations ────────────────────────────────────────────────────────────
def create_user(username: str, email: str, hashed_pw: str, full_name: str = "") -> int:
    conn = _get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)",
        (username, email, hashed_pw, full_name),
    )
    conn.commit()
    uid = cur.lastrowid
    conn.close()
    return uid


def get_user_by_username(username: str):
    conn = _get_connection()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_email(email: str):
    conn = _get_connection()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int):
    conn = _get_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_user(user_id: int, **kwargs):
    """Update arbitrary columns: update_user(1, full_name='New', bio='…')"""
    allowed = {"full_name", "bio", "avatar_url", "email", "password"}
    fields = {k: v for k, v in kwargs.items() if k in allowed}
    if not fields:
        return
    set_clause = ", ".join(f"{k} = ?" for k in fields)
    values = list(fields.values()) + [datetime.utcnow().isoformat(), user_id]
    conn = _get_connection()
    conn.execute(
        f"UPDATE users SET {set_clause}, updated_at = ? WHERE id = ?", values
    )
    conn.commit()
    conn.close()


# ─── Essay operations ────────────────────────────────────────────────────────────
def save_essay(user_id: int, title: str, content: str,
               grammar: float = 0, coherence: float = 0,
               argument: float = 0, overall: float = 0,
               feedback: str = "") -> int:
    conn = _get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO essays
           (user_id, title, content, grammar_score, coherence_score,
            argument_score, overall_score, feedback)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, title, content, grammar, coherence, argument, overall, feedback),
    )
    conn.commit()
    eid = cur.lastrowid
    conn.close()
    return eid


def get_user_essays(user_id: int, limit: int = 50):
    conn = _get_connection()
    rows = conn.execute(
        "SELECT * FROM essays WHERE user_id = ? ORDER BY submitted_at DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_essay_count(user_id: int) -> int:
    conn = _get_connection()
    row = conn.execute(
        "SELECT COUNT(*) as cnt FROM essays WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()
    return row["cnt"] if row else 0


def get_average_scores(user_id: int):
    conn = _get_connection()
    row = conn.execute(
        """SELECT
               ROUND(AVG(grammar_score),  1) AS avg_grammar,
               ROUND(AVG(coherence_score),1) AS avg_coherence,
               ROUND(AVG(argument_score), 1) AS avg_argument,
               ROUND(AVG(overall_score),  1) AS avg_overall
           FROM essays WHERE user_id = ?""",
        (user_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else {}
