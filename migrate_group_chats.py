import sqlite3
import os

def migrate():
    db_path = 'instance/chat.db' if os.path.exists('instance/chat.db') else 'chat.db'
    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    try:
        # Create conversation_member table
        c.execute("""
            CREATE TABLE IF NOT EXISTS conversation_member (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                username VARCHAR(80) NOT NULL,
                FOREIGN KEY(conversation_id) REFERENCES conversation(id) ON DELETE CASCADE,
                UNIQUE(conversation_id, username)
            )
        """)
        print("Ensured conversation_member table exists.")

        # Add columns to conversation table safely
        c.execute("PRAGMA table_info(conversation)")
        columns = [row[1] for row in c.fetchall()]

        if 'is_group' not in columns:
            c.execute("ALTER TABLE conversation ADD COLUMN is_group BOOLEAN DEFAULT 0")
            print("Added is_group column to conversation.")
        
        if 'name' not in columns:
            c.execute("ALTER TABLE conversation ADD COLUMN name VARCHAR(80)")
            print("Added name column to conversation.")

        # Migrate existing users to conversation_member
        c.execute("SELECT id, user_a, user_b FROM conversation")
        convs = c.fetchall()
        migrated_count = 0
        for conv_id, user_a, user_b in convs:
            for user in [user_a, user_b]:
                if user:
                    try:
                        c.execute("INSERT INTO conversation_member (conversation_id, username) VALUES (?, ?)", (conv_id, user))
                        migrated_count += 1
                    except sqlite3.IntegrityError:
                        pass # Already exists

        print(f"Migrated {migrated_count} members.")
        
        conn.commit()
        print("Migration successful.")
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
