-- ═══════════════════════════════════════════════════════════
-- DigiFriend — Booking System SQL Setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════


-- ── 1. Add columns to the existing 'calls' table ─────────────
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS digifriend_id   uuid,
  ADD COLUMN IF NOT EXISTS status          text DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS is_recurring    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS day_of_week     int,
  ADD COLUMN IF NOT EXISTS hour_local      int,
  ADD COLUMN IF NOT EXISTS member_timezone text,
  ADD COLUMN IF NOT EXISTS member_name     text,
  ADD COLUMN IF NOT EXISTS cancelled_at    timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by    text;


-- ── 2. Add 'email' and 'timezone' to digifriends table ───────
--    (skip if these columns already exist)
ALTER TABLE digifriends
  ADD COLUMN IF NOT EXISTS email    text,
  ADD COLUMN IF NOT EXISTS timezone text;


-- ── 3. Create the availability table ─────────────────────────
CREATE TABLE IF NOT EXISTS availability (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  digifriend_id  uuid        NOT NULL,
  day_of_week    int         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  hour           int         NOT NULL CHECK (hour BETWEEN 0 AND 23),
  timezone       text        NOT NULL,
  is_active      boolean     DEFAULT true,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (digifriend_id, day_of_week, hour)
);


-- ── 4. Row Level Security for availability ────────────────────
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- Anyone can read availability (so members can see DF slots)
DROP POLICY IF EXISTS "public_read_availability" ON availability;
CREATE POLICY "public_read_availability"
  ON availability FOR SELECT USING (true);

-- Anon key can insert/update/delete (DF portal uses anon key)
DROP POLICY IF EXISTS "anon_write_availability" ON availability;
CREATE POLICY "anon_write_availability"
  ON availability FOR ALL USING (true) WITH CHECK (true);


-- ── 5. Row Level Security for calls ──────────────────────────
--    Open policy so both members and DF portal can read/write.
--    Tighten this later once you have DF auth user IDs stored.
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_calls_policy" ON calls;
CREATE POLICY "open_calls_policy"
  ON calls FOR ALL USING (true) WITH CHECK (true);


-- ── 6. Row Level Security for digifriends ────────────────────
ALTER TABLE digifriends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_digifriends" ON digifriends;
CREATE POLICY "public_read_digifriends"
  ON digifriends FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon_write_digifriends" ON digifriends;
CREATE POLICY "anon_write_digifriends"
  ON digifriends FOR ALL USING (true) WITH CHECK (true);


-- ── 7. (Optional) Set a DigiFriend's email so they can log in ─
--    Run once per DigiFriend after creating their record.
--    Replace the values with the real ones.
--
-- UPDATE digifriends
--   SET email = 'james@example.com', timezone = 'Africa/Nairobi'
--   WHERE id = 'paste-digifriend-uuid-here';


-- ── 8. (Optional) Match a member with a DigiFriend ────────────
--    This stores the DF id in the member's Supabase auth metadata.
--    Run this in the Supabase Dashboard → Authentication → Users
--    → click the user → Edit → add to raw_user_meta_data:
--
--    { "matched": true, "digifriend_id": "paste-digifriend-uuid-here" }
--
--    Or run via SQL (replace both UUIDs):
--
-- UPDATE auth.users
--   SET raw_user_meta_data = raw_user_meta_data ||
--       '{"matched": true, "digifriend_id": "paste-df-uuid"}'::jsonb
--   WHERE id = 'paste-member-auth-uuid-here';


-- ═══════════════════════════════════════════════════════════
-- DONE. Your booking system is ready.
-- ═══════════════════════════════════════════════════════════
