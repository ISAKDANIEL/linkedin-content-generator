"""
SQLite-based local database fallback used when Supabase credentials are not configured.
Provides the same interface used by user_service.py and history_service.py.
Database file: backend/local_data.db
"""
import sqlite3
import uuid
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'local_data.db')


def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_local_db():
    """Create tables if they don't exist."""
    conn = _get_conn()
    cur = conn.cursor()
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            name TEXT,
            avatar_url TEXT,
            provider TEXT DEFAULT 'email',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS search_history (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT NOT NULL,
            tone TEXT,
            audience TEXT,
            result TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()
    print("Local SQLite DB initialized (local_data.db)")


# ── User operations ──────────────────────────────────────────────────────────
def local_get_user_by_email(email: str) -> dict | None:
    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def local_get_user_by_id(user_id: str) -> dict | None:
    conn = _get_conn()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def local_create_user(email: str, name: str, password_hash: str | None, provider: str = 'email') -> dict | None:
    uid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO users (id, email, password_hash, name, provider, created_at) VALUES (?,?,?,?,?,?)",
            (uid, email, password_hash, name, provider, now)
        )
        conn.commit()
        return {"id": uid, "email": email, "name": name, "provider": provider, "created_at": now}
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()


# ── History operations ────────────────────────────────────────────────────────
def local_save_history(user_id: str, title: str, tone: str, audience: str, result: dict) -> dict | None:
    hid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO search_history (id, user_id, title, tone, audience, result, created_at) VALUES (?,?,?,?,?,?,?)",
            (hid, user_id, title, tone, audience, json.dumps(result), now)
        )
        conn.commit()
        return {"id": hid, "user_id": user_id, "title": title, "tone": tone, "audience": audience, "created_at": now}
    finally:
        conn.close()


def local_get_history(user_id: str) -> list:
    conn = _get_conn()
    try:
        rows = conn.execute(
            "SELECT id, title, tone, audience, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user_id,)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def local_get_history_item(history_id: str, user_id: str) -> dict | None:
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM search_history WHERE id = ? AND user_id = ?",
            (history_id, user_id)
        ).fetchone()
        if not row:
            return None
        item = dict(row)
        if item.get('result'):
            item['result'] = json.loads(item['result'])
        return item
    finally:
        conn.close()


def local_delete_history(history_id: str, user_id: str) -> bool:
    conn = _get_conn()
    try:
        cur = conn.execute(
            "DELETE FROM search_history WHERE id = ? AND user_id = ?",
            (history_id, user_id)
        )
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
