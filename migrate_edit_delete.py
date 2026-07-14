import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'chat.db')

def migrate():
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE message ADD COLUMN is_edited BOOLEAN DEFAULT 0 NOT NULL")
        print("Added is_edited column.")
    except sqlite3.OperationalError as e:
        print(f"Column is_edited might already exist: {e}")

    try:
        cursor.execute("ALTER TABLE message ADD COLUMN is_deleted BOOLEAN DEFAULT 0 NOT NULL")
        print("Added is_deleted column.")
    except sqlite3.OperationalError as e:
        print(f"Column is_deleted might already exist: {e}")

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
