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
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

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
```

## Notes
- `users.password_hash` is `NULL` for Google OAuth users.
- `search_history.result` stores the full GPT-4o JSON response (JSONB).
- Row Level Security (RLS) is **not** enabled by default. If you want production-level security, enable RLS on both tables and add policies using `auth.uid()` matching `user_id`.
