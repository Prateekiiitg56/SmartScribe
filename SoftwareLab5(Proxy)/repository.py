'''import sqlite3

conn = sqlite3.connect("database.db")
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE essays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    essay TEXT,
    score INTEGER
)
""")

conn.commit()
conn.close()
'''

import sqlite3

def save_essay(essay, score):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO essays (essay, score) VALUES (?, ?)", (essay, score))
    conn.commit()
    conn.close()
