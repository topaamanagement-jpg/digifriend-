-- ═══════════════════════════════════════════════════════════
-- DigiFriend — Fix: manglende kolonne fundet under test
-- Kør i: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════

-- Uden denne kan bekræftelses-emails til members ikke sendes,
-- og booking-requests fejler helt.
ALTER TABLE calls ADD COLUMN IF NOT EXISTS member_email text;


-- ── Foto-upload på become.html (ansøgninger) ─────────────────
-- Bucketen afviser i dag alle uploads. Disse regler tillader
-- upload + offentlig visning af fotos i df-photos bucketen.
INSERT INTO storage.buckets (id, name, public)
VALUES ('df-photos', 'df-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "df_photos_insert" ON storage.objects;
CREATE POLICY "df_photos_insert" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'df-photos');

DROP POLICY IF EXISTS "df_photos_read" ON storage.objects;
CREATE POLICY "df_photos_read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'df-photos');


-- ── Sikring: live chat-opdateringer ──────────────────────────
-- Gør ingenting hvis messages allerede er tilføjet til realtime.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
