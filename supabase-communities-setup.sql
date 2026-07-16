-- ═══════════════════════════════════════════════════════════
-- DigiFriend — Communities (nursing homes / senior living) setup
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════

-- ── 1. Mark which DigiFriends are willing to do group/community calls ──
ALTER TABLE digifriends
  ADD COLUMN IF NOT EXISTS community_available boolean DEFAULT false;

-- ── 2. Leads from the "For Communities" contact form ──
CREATE TABLE IF NOT EXISTS community_leads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name         text        NOT NULL,
  contact_name     text        NOT NULL,
  email            text        NOT NULL,
  phone            text,
  country          text,
  resident_count   text,
  message          text,
  status           text        DEFAULT 'new',
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE community_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_community_leads" ON community_leads;
CREATE POLICY "anon_insert_community_leads"
  ON community_leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "open_read_community_leads" ON community_leads;
CREATE POLICY "open_read_community_leads"
  ON community_leads FOR SELECT USING (true);

DROP POLICY IF EXISTS "open_update_community_leads" ON community_leads;
CREATE POLICY "open_update_community_leads"
  ON community_leads FOR UPDATE USING (true);

-- ── 3. Community group calls (admin logs these manually for invoicing) ──
CREATE TABLE IF NOT EXISTS community_calls (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_name         text        NOT NULL,
  contact_email    text,
  digifriend_id    uuid REFERENCES digifriends(id),
  scheduled_at     timestamptz NOT NULL,
  resident_count   int,
  notes            text,
  invoiced         boolean     DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE community_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_community_calls" ON community_calls;
CREATE POLICY "open_community_calls"
  ON community_calls FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════
