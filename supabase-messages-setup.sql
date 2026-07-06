-- ═══════════════════════════════════════════════════════════
-- DigiFriend — Messages & Email Setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════


-- ── 1. Create messages table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      uuid        NOT NULL,
  digifriend_id  uuid        NOT NULL,
  sender_id      uuid        NOT NULL,
  sender_type    text        NOT NULL CHECK (sender_type IN ('member', 'friend')),
  body           text        NOT NULL,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx
  ON messages (member_id, digifriend_id, created_at);


-- ── 2. Row Level Security for messages ───────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_messages_policy" ON messages;
CREATE POLICY "open_messages_policy"
  ON messages FOR ALL USING (true) WITH CHECK (true);


-- ── 3. Enable Realtime for messages ──────────────────────────
-- This allows the chat page to receive new messages live.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;


-- ── 4. Add member_email to calls (for email notifications) ───
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS member_email text;


-- ═══════════════════════════════════════════════════════════
-- DONE. Run supabase-booking-setup.sql first if you haven't.
-- ═══════════════════════════════════════════════════════════
