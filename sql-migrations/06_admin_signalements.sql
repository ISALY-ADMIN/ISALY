-- Migration 06 : table signalements (reports utilisateurs)
-- À exécuter dans Supabase Dashboard > SQL Editor

-- Table des signalements de contenu (profils / annonces inappropriés)
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('profile', 'listing')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes admin fréquentes
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS reports_target_idx ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS reports_created_idx ON reports(created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur connecté peut créer un signalement
CREATE POLICY "reports_insert" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Chacun peut voir ses propres signalements
CREATE POLICY "reports_select_own" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Les admins voient et modifient tout
CREATE POLICY "reports_admin_all" ON reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Structure attendue de la table admin_actions (déjà créée en base) :
-- CREATE TABLE IF NOT EXISTS admin_actions (
--   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
--   admin_id UUID REFERENCES profiles(id),
--   action TEXT NOT NULL,
--   target_type TEXT,
--   target_id UUID,
--   details JSONB,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );
