import sqlite3
from datetime import datetime
import os

class Database:
    def __init__(self, db_name="database.db"):
        self.db_name = db_name
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_name)

    def __init__(self, db_name="database.db"):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.db_name = os.path.join(base_dir, db_name)
        self.init_db()

    def init_db(self):  # defining tables for the essays, feedbacks, users and organizations
        conn = self.get_connection()
        cursor = conn.cursor()
        # Organizations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS organizations (
            org_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE
        )
        """)
        # Users
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            password TEXT,
            role TEXT,
            org_id INTEGER,
            FOREIGN KEY(org_id) REFERENCES organizations(org_id)
        )
        """)
        # Essays
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS essays (
            essay_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            content TEXT,
            submission_date TEXT,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
        """)
        # Feedback
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
            essay_id INTEGER,
            score INTEGER,
            comments TEXT,
            FOREIGN KEY(essay_id) REFERENCES essays(essay_id)
        )
        """)
        conn.commit()
        conn.close()

    def create_organization(self, name):  #defining organiation related elements
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                "INSERT INTO organizations (name) VALUES (?)",
                (name,)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            pass  # already exists

        conn.close()

    def get_organization_by_name(self, name):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM organizations WHERE name=?", (name,))
        org = cursor.fetchone()

        conn.close()
        return org

    def create_user(self, name, email, password, role, org_id):  #user related elements
        conn = self.get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(
                "INSERT INTO users (name, email, password, role, org_id) VALUES (?, ?, ?, ?, ?)",
                (name, email, password, role, org_id)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            print("User already exists")

        conn.close()

    def get_user_by_email(self, email):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE email=?", (email,))
        user = cursor.fetchone()

        conn.close()
        return user

    def get_user_by_id(self, user_id):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM users WHERE user_id=?", (user_id,))
        user = cursor.fetchone()

        conn.close()
        return user

    def save_essay(self, user_id, content):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO essays (user_id, content, submission_date) VALUES (?, ?, ?)",
            (user_id, content, str(datetime.now()))
        )

        essay_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return essay_id

    def get_essays_by_user(self, user_id):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM essays WHERE user_id=?", (user_id,))
        essays = cursor.fetchall()

        conn.close()
        return essays

    def save_feedback(self, essay_id, score, comments):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            "INSERT INTO feedback (essay_id, score, comments) VALUES (?, ?, ?)",
            (essay_id, score, comments)
        )

        conn.commit()
        conn.close()

    def get_feedback_by_essay(self, essay_id):
        conn = self.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM feedback WHERE essay_id=?", (essay_id,))
        feedback = cursor.fetchone()

        conn.close()
        return feedback