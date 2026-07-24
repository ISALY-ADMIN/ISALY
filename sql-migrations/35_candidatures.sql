-- ============================================================
-- ISALY · Migration 35 — Refonte du process de candidature.
-- Une candidature = un swipe (direction right/super) ciblant une
-- annonce (listing_id) + le loueur (swiped_id = owner), enrichi de
-- critères saisis par le locataire et d'un statut de décision géré
-- par le loueur.
-- Idempotent — à exécuter dans le SQL editor Supabase.
-- ============================================================

-- ── 1. Critères de candidature (saisis par le locataire) ─────
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS motivation_message TEXT;
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS move_in_date DATE;
-- Durée de bail envisagée, en mois ('3','6','9','12','18','24','36')
-- ou 'flexible' — stocké en TEXT pour rester souple côté UI.
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS lease_duration TEXT;
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS emploi_situation TEXT;
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS has_garant BOOLEAN;
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS colocataires_count INTEGER;
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

-- ── 2. Statut de décision (géré par le loueur) ───────────────
-- pending (défaut) | accepted | rejected | waitlisted | visit_proposed
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS candidature_status TEXT DEFAULT 'pending';
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;

ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_candidature_status_check;
ALTER TABLE swipes ADD CONSTRAINT swipes_candidature_status_check
  CHECK (candidature_status IS NULL OR candidature_status IN
    ('pending', 'accepted', 'rejected', 'waitlisted', 'visit_proposed'));

ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_emploi_situation_check;
ALTER TABLE swipes ADD CONSTRAINT swipes_emploi_situation_check
  CHECK (emploi_situation IS NULL OR emploi_situation IN
    ('salarie', 'etudiant', 'independant', 'autre'));

-- ── 3. Index : file des candidatures d'une annonce / d'un loueur ─
CREATE INDEX IF NOT EXISTS idx_swipes_candidature_status
  ON swipes(swiped_id, candidature_status)
  WHERE candidature_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_swipes_listing_applied
  ON swipes(listing_id, applied_at)
  WHERE applied_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
