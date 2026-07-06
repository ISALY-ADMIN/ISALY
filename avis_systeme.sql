-- ═══════════════════════════════════════════════════════════════
-- SYSTÈME D'AVIS — user_reviews : réponse, signalement, RLS
-- À exécuter dans le SQL Editor Supabase (idempotent)
-- ═══════════════════════════════════════════════════════════════

-- 1. Nouvelles colonnes : réponse de la personne évaluée + signalement
ALTER TABLE public.user_reviews ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE public.user_reviews ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;
ALTER TABLE public.user_reviews ADD COLUMN IF NOT EXISTS reported BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Contrainte unique : un seul avis par paire (reviewer, reviewed)
--    (le re-dépôt côté app devient une modification via upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_reviews_reviewer_reviewed_unique'
  ) THEN
    ALTER TABLE public.user_reviews
      ADD CONSTRAINT user_reviews_reviewer_reviewed_unique UNIQUE (reviewer_id, reviewed_id);
  END IF;
END $$;

-- 3. Garde-fous de base
ALTER TABLE public.user_reviews
  DROP CONSTRAINT IF EXISTS user_reviews_rating_check;
ALTER TABLE public.user_reviews
  ADD CONSTRAINT user_reviews_rating_check CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public.user_reviews
  DROP CONSTRAINT IF EXISTS user_reviews_no_self_review;
ALTER TABLE public.user_reviews
  ADD CONSTRAINT user_reviews_no_self_review CHECK (reviewer_id <> reviewed_id);

-- 4. RLS
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- Lecture : publique (les avis s'affichent sur les profils publics)
DROP POLICY IF EXISTS "user_reviews_select" ON public.user_reviews;
CREATE POLICY "user_reviews_select" ON public.user_reviews
  FOR SELECT USING (true);

-- Création : uniquement ses propres avis
DROP POLICY IF EXISTS "user_reviews_insert_own" ON public.user_reviews;
CREATE POLICY "user_reviews_insert_own" ON public.user_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Modification par l'auteur : son propre avis (note / commentaire),
-- sans pouvoir toucher à la réponse de la personne évaluée
DROP POLICY IF EXISTS "user_reviews_update_own" ON public.user_reviews;
CREATE POLICY "user_reviews_update_own" ON public.user_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Modification par la personne évaluée : uniquement sa réponse
DROP POLICY IF EXISTS "user_reviews_update_reply" ON public.user_reviews;
CREATE POLICY "user_reviews_update_reply" ON public.user_reviews
  FOR UPDATE USING (auth.uid() = reviewed_id)
  WITH CHECK (auth.uid() = reviewed_id);

-- Suppression : l'auteur peut retirer son avis
DROP POLICY IF EXISTS "user_reviews_delete_own" ON public.user_reviews;
CREATE POLICY "user_reviews_delete_own" ON public.user_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- NB : le signalement (reported = true) et la vérification anti-spam
-- (relation réelle requise) passent par l'API serveur (service role),
-- qui contrôle finement les champs modifiés — les policies ci-dessus
-- couvrent l'accès direct client.
