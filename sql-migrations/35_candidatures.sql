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

-- ── 3. Unicité : UNE candidature par (locataire, annonce) ────
-- Bug corrigé : l'ancienne contrainte unique (swiper_id, swiped_id)
-- limitait un locataire à UNE candidature par loueur → sa 2ᵉ
-- candidature sur une autre annonce du même loueur écrasait la 1ʳᵉ.
-- On la remplace par deux index uniques PARTIELS :
--   • (swiper_id, listing_id) quand listing_id IS NOT NULL
--       → une candidature par annonce (comportement voulu)
--   • (swiper_id, swiped_id) quand listing_id IS NULL
--       → préserve le dédoublonnage des swipes de profil (coloc),
--         utilisés par /api/swipe et sa vérification de match mutuel.

-- 3a. Supprime toute contrainte UNIQUE portant exactement sur
--     (swiper_id, swiped_id) — quel que soit son nom auto-généré.
DO $$
DECLARE
  cname text;
  target_cols int[] := (
    SELECT array_agg(attnum ORDER BY attnum)
    FROM pg_attribute
    WHERE attrelid = 'swipes'::regclass
      AND attname IN ('swiper_id', 'swiped_id')
  );
BEGIN
  FOR cname IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'swipes'::regclass
      AND contype = 'u'
      AND (SELECT array_agg(k ORDER BY k) FROM unnest(conkey) AS k) = target_cols
  LOOP
    EXECUTE format('ALTER TABLE swipes DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

-- 3b. Supprime d'éventuels index uniques STANDALONE historiques
--     sur (swiper_id, swiped_id) (noms usuels Supabase/manuels).
DROP INDEX IF EXISTS swipes_swiper_id_swiped_id_key;
DROP INDEX IF EXISTS swipes_swiper_swiped_unique;
DROP INDEX IF EXISTS idx_swipes_swiper_swiped;

-- 3c. Nouveaux index uniques partiels.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_swipes_swiper_listing
  ON swipes(swiper_id, listing_id)
  WHERE listing_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_swipes_swiper_swiped_noListing
  ON swipes(swiper_id, swiped_id)
  WHERE listing_id IS NULL;

-- ── 4. Index : file des candidatures d'une annonce / d'un loueur ─
CREATE INDEX IF NOT EXISTS idx_swipes_candidature_status
  ON swipes(swiped_id, candidature_status)
  WHERE candidature_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_swipes_listing_applied
  ON swipes(listing_id, applied_at)
  WHERE applied_at IS NOT NULL;

-- ── 5. RLS : le loueur (cible) peut décider d'une candidature ──
-- Le centre de décision loueur met à jour candidature_status /
-- decided_at côté client (client user-scopé). Sans cette policy,
-- l'UPDATE est rejeté silencieusement par RLS. Le loueur est
-- swiped_id ; il ne modifie jamais son identité (WITH CHECK stable).
-- Créer la policy est inerte si la RLS est désactivée sur swipes.
DROP POLICY IF EXISTS "swipes_update_target" ON swipes;
CREATE POLICY "swipes_update_target" ON swipes
  FOR UPDATE
  USING (swiped_id = auth.uid())
  WITH CHECK (swiped_id = auth.uid());

NOTIFY pgrst, 'reload schema';
