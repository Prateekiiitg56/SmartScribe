import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "smartscribe.db")

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
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

# User operations
def create_user(username, email, hashed_pw, full_name=""):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)",
        (username, email, hashed_pw, full_name),
    )
    conn.commit()
    uid = cur.lastrowid
    conn.close()
    return uid

def get_user_by_username(username):
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_id(user_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_by_email(email):
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None

# Essay operations
def save_essay(user_id, title, content, grammar=0, coherence=0, argument=0, overall=0, feedback=""):
    conn = get_connection()
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

def get_user_essays(user_id, limit=50):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM essays WHERE user_id = ? ORDER BY submitted_at DESC LIMIT ?",
        (user_id, limit),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_average_scores(user_id):
    conn = get_connection()
    row = conn.execute(
        """SELECT
               AVG(grammar_score) AS avg_grammar,
               AVG(coherence_score) AS avg_coherence,
               AVG(argument_score) AS avg_argument,
               AVG(overall_score) AS avg_overall
           FROM essays WHERE user_id = ?""",
        (user_id,),
    ).fetchone()
    conn.close()
    if not row or row['avg_overall'] is None:
        return {"avg_grammar": 0, "avg_coherence": 0, "avg_argument": 0, "avg_overall": 0}

    return {
        "avg_grammar": round(row['avg_grammar'], 1),
        "avg_coherence": round(row['avg_coherence'], 1),
        "avg_argument": round(row['avg_argument'], 1),
        "avg_overall": round(row['avg_overall'], 1)
    }

def delete_essay(essay_id, user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM essays WHERE id = ? AND user_id = ?", (essay_id, user_id))
    conn.commit()
    rows_affected = cur.rowcount
    conn.close()
    return rows_affected > 0
