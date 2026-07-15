"""
Migration: Fix conversation table to allow NULL for user_a and user_b columns.
This is required for group chats which don't have user_a/user_b values.
SQLite doesn't support ALTER COLUMN, so we recreate the table.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chat.db')

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if migration is needed (user_a has NOT NULL constraint)
    cursor.execute("PRAGMA table_info(conversation)")
    columns = cursor.fetchall()
    user_a_col = [c for c in columns if c[1] == 'user_a']
    if user_a_col and user_a_col[0][3] == 0:
        print("Migration not needed — user_a already allows NULL.")
        conn.close()
        return

    print("Starting migration: making user_a and user_b nullable...")

    cursor.execute("PRAGMA foreign_keys=OFF")
    cursor.execute("BEGIN TRANSACTION")

    try:
        # Create new table with correct schema
        cursor.execute("""
            CREATE TABLE conversation_new (
                id INTEGER PRIMARY KEY,
                is_group BOOLEAN DEFAULT 0,
                name VARCHAR(80),
                user_a VARCHAR(80),
                user_b VARCHAR(80),
                created_at DATETIME
            )
        """)

        # Copy existing data
        cursor.execute("""
            INSERT INTO conversation_new (id, is_group, name, user_a, user_b, created_at)
            SELECT id, is_group, name, user_a, user_b, created_at FROM conversation
        """)

        # Drop old table and rename new one
        cursor.execute("DROP TABLE conversation")
        cursor.execute("ALTER TABLE conversation_new RENAME TO conversation")

        cursor.execute("COMMIT")
        print("Migration complete! user_a and user_b are now nullable.")
    except Exception as e:
        cursor.execute("ROLLBACK")
        print(f"Migration failed: {e}")
        raise
    finally:
        cursor.execute("PRAGMA foreign_keys=ON")
        conn.close()


if __name__ == '__main__':
    migrate()
