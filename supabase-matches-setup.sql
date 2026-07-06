-- ═══════════════════════════════════════════════════════════
-- DigiFriend — Matches table
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════

-- Stores which DigiFriend each member is matched with.
-- Admin creates matches via admin.html — no manual SQL needed.

CREATE TABLE IF NOT EXISTS matches (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_email   text        NOT NULL UNIQUE,
  digifriend_id  uuid        NOT NULL,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_matches" ON matches;
CREATE POLICY "open_matches"
  ON matches FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- DONE. Upload updated admin.html, booking.html, chat.html
-- and digifriend-portal.html to Netlify after running this.
-- ═══════════════════════════════════════════════════════════
