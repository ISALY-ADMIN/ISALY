-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 04 — Table match_alert_log
-- À exécuter dans le Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS match_alert_log (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  alerted_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, alerted_profile_id)
);

ALTER TABLE match_alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_alert_log_select" ON match_alert_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "match_alert_log_insert" ON match_alert_log FOR INSERT WITH CHECK (true);
