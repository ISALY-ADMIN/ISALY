-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 05 — Table silent_match_log
-- À exécuter dans le Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS silent_match_log (
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE PRIMARY KEY,
  reminded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE silent_match_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "silent_match_log_service" ON silent_match_log USING (true) WITH CHECK (true);
