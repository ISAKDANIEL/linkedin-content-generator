# Ultra Content Creator — Supabase Schema

Run the following SQL in **Supabase Dashboard → SQL Editor**.

```sql
-- ── 1. Users table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,           -- NULL for Google OAuth users
  name          TEXT,
  avatar_url    TEXT,
  provider      TEXT DEFAULT 'email',  -- 'email' | 'google'
  credits       INTEGER DEFAULT 3,     -- generation credits
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add credits column to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 3;

-- ── 2. Search history ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  tone       TEXT,
  audience   TEXT,
  result     JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history (user_id);

-- ── 3. Generated content (existing — add user_id column) ───────────────────
ALTER TABLE generated_content
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- ── 4. Payments table (Dodo Payments) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_id    TEXT UNIQUE NOT NULL,  -- Dodo payment_id (idempotency key)
  product_id    TEXT NOT NULL,
  credits_added INTEGER NOT NULL,
  status        TEXT DEFAULT 'succeeded',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments (payment_id);
```

## Notes
- `users.password_hash` is `NULL` for Google OAuth users.
- `search_history.result` stores the full GPT-4o JSON response (JSONB).
- Row Level Security (RLS) is **not** enabled by default. If you want production-level security, enable RLS on both tables and add policies using `auth.uid()` matching `user_id`.
