import sqlite3
import os
import random
import string
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
            role        TEXT    DEFAULT 'student',
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
    # --- Teacher Mode tables ---
    cur.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            description TEXT    DEFAULT '',
            teacher_id  INTEGER NOT NULL,
            room_code   TEXT    NOT NULL UNIQUE,
            created_at  TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS room_members (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id     INTEGER NOT NULL,
            student_id  INTEGER NOT NULL,
            joined_at   TEXT    DEFAULT (datetime('now')),
            FOREIGN KEY (room_id)    REFERENCES rooms(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(room_id, student_id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS room_essays (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            room_id          INTEGER NOT NULL,
            student_id       INTEGER NOT NULL,
            title            TEXT    DEFAULT 'Untitled Essay',
            content          TEXT    NOT NULL,
            submitted_at     TEXT    DEFAULT (datetime('now')),
            teacher_review   TEXT    DEFAULT '',
            teacher_grammar  REAL    DEFAULT 0,
            teacher_coherence REAL   DEFAULT 0,
            teacher_argument REAL    DEFAULT 0,
            teacher_overall  REAL    DEFAULT 0,
            reviewed_at      TEXT    DEFAULT NULL,
            FOREIGN KEY (room_id)    REFERENCES rooms(id)  ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id)  ON DELETE CASCADE
        )
    """)
    # Add role column if migrating from older schema
    try:
        cur.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'")
    except sqlite3.OperationalError:
        pass  # column already exists
    conn.commit()
    conn.close()

# ──────────────────── User operations ────────────────────
def create_user(username, email, hashed_pw, full_name="", role="student"):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)",
        (username, email, hashed_pw, full_name, role),
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

# ──────────────────── Essay operations ────────────────────
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

def get_total_essays(user_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT COUNT(*) AS total FROM essays WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    return int(row['total']) if row and row['total'] is not None else 0

def delete_essay(essay_id, user_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM essays WHERE id = ? AND user_id = ?", (essay_id, user_id))
    conn.commit()
    rows_affected = cur.rowcount
    conn.close()
    return rows_affected > 0

# ──────────────────── Room operations ────────────────────
def _generate_room_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def create_room(teacher_id, name, description=""):
    conn = get_connection()
    cur = conn.cursor()
    # Keep generating until we get a unique code
    for _ in range(10):
        code = _generate_room_code()
        try:
            cur.execute(
                "INSERT INTO rooms (name, description, teacher_id, room_code) VALUES (?, ?, ?, ?)",
                (name, description, teacher_id, code),
            )
            conn.commit()
            rid = cur.lastrowid
            conn.close()
            return {"id": rid, "room_code": code}
        except sqlite3.IntegrityError:
            continue
    conn.close()
    return None

def get_teacher_rooms(teacher_id):
    conn = get_connection()
    rows = conn.execute(
        """SELECT r.*, COUNT(rm.id) AS student_count
           FROM rooms r
           LEFT JOIN room_members rm ON rm.room_id = r.id
           WHERE r.teacher_id = ?
           GROUP BY r.id
           ORDER BY r.created_at DESC""",
        (teacher_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_room_by_id(room_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM rooms WHERE id = ?", (room_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_room_by_code(room_code):
    conn = get_connection()
    row = conn.execute("SELECT * FROM rooms WHERE room_code = ?", (room_code,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_room_members(room_id):
    conn = get_connection()
    rows = conn.execute(
        """SELECT u.id, u.username, u.full_name, u.email, rm.joined_at
           FROM room_members rm
           JOIN users u ON u.id = rm.student_id
           WHERE rm.room_id = ?
           ORDER BY rm.joined_at DESC""",
        (room_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def add_room_member(room_id, student_id):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO room_members (room_id, student_id) VALUES (?, ?)",
            (room_id, student_id),
        )
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False

def remove_room_member(room_id, student_id):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM room_members WHERE room_id = ? AND student_id = ?", (room_id, student_id))
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0

def is_room_member(room_id, student_id):
    conn = get_connection()
    row = conn.execute(
        "SELECT id FROM room_members WHERE room_id = ? AND student_id = ?",
        (room_id, student_id),
    ).fetchone()
    conn.close()
    return row is not None

# ──────────────────── Room Essay operations ────────────────────
def submit_room_essay(room_id, student_id, title, content):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """INSERT INTO room_essays (room_id, student_id, title, content)
           VALUES (?, ?, ?, ?)""",
        (room_id, student_id, title, content),
    )
    conn.commit()
    eid = cur.lastrowid
    conn.close()
    return eid

def get_room_essays(room_id):
    conn = get_connection()
    rows = conn.execute(
        """SELECT re.*, u.username, u.full_name
           FROM room_essays re
           JOIN users u ON u.id = re.student_id
           WHERE re.room_id = ?
           ORDER BY re.submitted_at DESC""",
        (room_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_room_essay_by_id(essay_id):
    conn = get_connection()
    row = conn.execute(
        """SELECT re.*, u.username, u.full_name
           FROM room_essays re
           JOIN users u ON u.id = re.student_id
           WHERE re.id = ?""",
        (essay_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def save_teacher_review(essay_id, review, grammar, coherence, argument, overall):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """UPDATE room_essays
           SET teacher_review = ?, teacher_grammar = ?, teacher_coherence = ?,
               teacher_argument = ?, teacher_overall = ?, reviewed_at = datetime('now')
           WHERE id = ?""",
        (review, grammar, coherence, argument, overall, essay_id),
    )
    conn.commit()
    affected = cur.rowcount
    conn.close()
    return affected > 0

def get_student_rooms(student_id):
    conn = get_connection()
    rows = conn.execute(
        """SELECT r.*, u.full_name AS teacher_name
           FROM room_members rm
           JOIN rooms r ON r.id = rm.room_id
           JOIN users u ON u.id = r.teacher_id
           WHERE rm.student_id = ?
           ORDER BY rm.joined_at DESC""",
        (student_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_student_room_essays(room_id, student_id):
    conn = get_connection()
    rows = conn.execute(
        """SELECT * FROM room_essays
           WHERE room_id = ? AND student_id = ?
           ORDER BY submitted_at DESC""",
        (room_id, student_id),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ──────────────────── Teacher Stats ────────────────────
def get_teacher_stats(teacher_id):
    conn = get_connection()

    # Total rooms
    total_rooms = conn.execute(
        "SELECT COUNT(*) AS c FROM rooms WHERE teacher_id = ?", (teacher_id,)
    ).fetchone()["c"]

    # Total unique students across all rooms
    total_students = conn.execute(
        """SELECT COUNT(DISTINCT rm.student_id) AS c
           FROM room_members rm
           JOIN rooms r ON r.id = rm.room_id
           WHERE r.teacher_id = ?""", (teacher_id,)
    ).fetchone()["c"]

    # Total essays submitted to teacher's rooms
    total_essays = conn.execute(
        """SELECT COUNT(*) AS c
           FROM room_essays re
           JOIN rooms r ON r.id = re.room_id
           WHERE r.teacher_id = ?""", (teacher_id,)
    ).fetchone()["c"]

    # Reviewed vs pending
    reviewed = conn.execute(
        """SELECT COUNT(*) AS c
           FROM room_essays re
           JOIN rooms r ON r.id = re.room_id
           WHERE r.teacher_id = ? AND re.reviewed_at IS NOT NULL""", (teacher_id,)
    ).fetchone()["c"]
    pending = total_essays - reviewed

    # Average scores given
    avg_row = conn.execute(
        """SELECT
               AVG(re.teacher_overall) AS avg_overall,
               AVG(re.teacher_grammar) AS avg_grammar,
               AVG(re.teacher_coherence) AS avg_coherence,
               AVG(re.teacher_argument) AS avg_argument
           FROM room_essays re
           JOIN rooms r ON r.id = re.room_id
           WHERE r.teacher_id = ? AND re.reviewed_at IS NOT NULL""", (teacher_id,)
    ).fetchone()

    # Recent essays (last 5)
    recent = conn.execute(
        """SELECT re.id, re.title, re.submitted_at, re.reviewed_at,
                  re.teacher_overall, u.full_name, u.username, r.name AS room_name
           FROM room_essays re
           JOIN rooms r ON r.id = re.room_id
           JOIN users u ON u.id = re.student_id
           WHERE r.teacher_id = ?
           ORDER BY re.submitted_at DESC LIMIT 5""", (teacher_id,)
    ).fetchall()

    conn.close()

    return {
        "total_rooms": total_rooms,
        "total_students": total_students,
        "total_essays": total_essays,
        "reviewed": reviewed,
        "pending": pending,
        "avg_scores": {
            "overall": round(avg_row["avg_overall"] or 0, 1),
            "grammar": round(avg_row["avg_grammar"] or 0, 1),
            "coherence": round(avg_row["avg_coherence"] or 0, 1),
            "argument": round(avg_row["avg_argument"] or 0, 1),
        },
        "recent_essays": [dict(r) for r in recent]
    }

