import sqlite3
conn = sqlite3.connect("/var/www/linkedin-generator/backend/local_data.db")
rows = conn.execute("SELECT id, user_id, title, length(result) FROM search_history ORDER BY created_at DESC LIMIT 5").fetchall()
for r in rows:
    print(r)
