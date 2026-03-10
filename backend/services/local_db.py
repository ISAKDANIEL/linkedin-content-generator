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
            credits INTEGER DEFAULT 3,
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

        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            payment_id TEXT UNIQUE NOT NULL,
            product_id TEXT NOT NULL,
            credits_added INTEGER NOT NULL,
            status TEXT DEFAULT 'succeeded',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS password_resets (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    """)
    # Migrate: add credits column to existing users table if absent
    try:
        cur.execute("ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 3")
        conn.commit()
    except Exception:
        pass  # Column already exists
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


# ── Credits operations ────────────────────────────────────────────────────────
def local_get_credits(user_id: str) -> int:
    conn = _get_conn()
    try:
        row = conn.execute("SELECT credits FROM users WHERE id = ?", (user_id,)).fetchone()
        return row["credits"] if row and row["credits"] is not None else 0
    finally:
        conn.close()


def local_add_credits(user_id: str, amount: int) -> int:
    """Add credits to user account. Returns new balance."""
    conn = _get_conn()
    try:
        conn.execute(
            "UPDATE users SET credits = COALESCE(credits, 0) + ? WHERE id = ?",
            (amount, user_id)
        )
        conn.commit()
        row = conn.execute("SELECT credits FROM users WHERE id = ?", (user_id,)).fetchone()
        return row["credits"] if row else 0
    finally:
        conn.close()


def local_deduct_credit(user_id: str) -> bool:
    """Deduct 1 credit from user. Returns True if successful, False if insufficient."""
    conn = _get_conn()
    try:
        row = conn.execute("SELECT credits FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row or (row["credits"] or 0) < 1:
            return False
        conn.execute(
            "UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0",
            (user_id,)
        )
        conn.commit()
        return True
    finally:
        conn.close()


# ── Payment record operations ─────────────────────────────────────────────────
def local_save_payment(user_id: str, payment_id: str, product_id: str, credits_added: int) -> bool:
    """Record a completed payment. Returns False if already processed (idempotent)."""
    pid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO payments (id, user_id, payment_id, product_id, credits_added, created_at) VALUES (?,?,?,?,?,?)",
            (pid, user_id, payment_id, product_id, credits_added, now)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False  # payment_id already processed
    finally:
        conn.close()


# ── Admin operations ──────────────────────────────────────────────────────────
def local_get_all_users() -> list:
    conn = _get_conn()
    try:
        rows = conn.execute(
            "SELECT id, email, name, provider, credits, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def local_get_all_payments() -> list:
    conn = _get_conn()
    try:
        rows = conn.execute("""
            SELECT p.id, p.user_id, p.payment_id, p.product_id, p.credits_added,
                   p.status, p.created_at, u.email, u.name
            FROM payments p
            LEFT JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def local_get_all_history() -> list:
    conn = _get_conn()
    try:
        rows = conn.execute("""
            SELECT h.id, h.user_id, h.title, h.tone, h.audience, h.created_at, u.email
            FROM search_history h
            LEFT JOIN users u ON h.user_id = u.id
            ORDER BY h.created_at DESC
            LIMIT 200
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def local_get_admin_stats() -> dict:
    conn = _get_conn()
    try:
        total_users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
        total_credits = conn.execute("SELECT COALESCE(SUM(credits), 0) as c FROM users").fetchone()["c"]
        total_payments = conn.execute("SELECT COUNT(*) as c FROM payments").fetchone()["c"]
        total_credits_sold = conn.execute("SELECT COALESCE(SUM(credits_added), 0) as c FROM payments").fetchone()["c"]
        total_generations = conn.execute("SELECT COUNT(*) as c FROM search_history").fetchone()["c"]
        return {
            "total_users": total_users,
            "total_credits_in_accounts": int(total_credits),
            "total_payments": total_payments,
            "total_credits_sold": int(total_credits_sold),
            "total_generations": total_generations,
        }
    finally:
        conn.close()


def local_set_user_credits(user_id: str, amount: int) -> int:
    """Set user credits to exact amount. Returns new balance."""
    conn = _get_conn()
    try:
        conn.execute("UPDATE users SET credits = ? WHERE id = ?", (max(0, amount), user_id))
        conn.commit()
        row = conn.execute("SELECT credits FROM users WHERE id = ?", (user_id,)).fetchone()
        return row["credits"] if row else 0
    finally:
        conn.close()


# ── Password reset operations ─────────────────────────────────────────────────
def local_create_password_reset(email: str, token: str, expires_at: str) -> bool:
    """Store a password reset token. Returns True on success."""
    rid = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = _get_conn()
    try:
        # Invalidate any previous unused tokens for this email
        conn.execute("UPDATE password_resets SET used=1 WHERE email=? AND used=0", (email,))
        conn.execute(
            "INSERT INTO password_resets (id, email, token, expires_at, created_at) VALUES (?,?,?,?,?)",
            (rid, email, token, expires_at, now)
        )
        conn.commit()
        return True
    except Exception:
        return False
    finally:
        conn.close()


def local_get_password_reset(token: str) -> dict | None:
    """Get a valid (unused, non-expired) reset record by token."""
    conn = _get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM password_resets WHERE token=? AND used=0",
            (token,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def local_use_password_reset(token: str) -> bool:
    """Mark token as used. Returns True if it was updated."""
    conn = _get_conn()
    try:
        cur = conn.execute("UPDATE password_resets SET used=1 WHERE token=?", (token,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def local_update_user_password(email: str, password_hash: str) -> bool:
    """Update user's password hash."""
    conn = _get_conn()
    try:
        cur = conn.execute("UPDATE users SET password_hash=? WHERE email=?", (password_hash, email))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()


def local_delete_user(user_id: str) -> bool:
    """Delete a user and all their data."""
    conn = _get_conn()
    try:
        conn.execute("DELETE FROM search_history WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM payments WHERE user_id = ?", (user_id,))
        cur = conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return cur.rowcount > 0
    finally:
        conn.close()
