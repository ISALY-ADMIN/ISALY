-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 36 : bug_reports — signalements de bugs par les bêta-testeurs
--
-- Fondation du système de correction assistée par IA :
--   • le widget /app/* insère (description, page_url, user_agent, contexte)
--   • l'admin trie / priorise depuis /admin/bug-reports
--   • l'agent IA remplira plus tard ai_diagnosis, ai_plan, ai_report, commit_sha
--
-- À exécuter dans Supabase Dashboard > SQL Editor.
-- Idempotent : ré-exécutable sans effet de bord.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────── Table ───────────────────────────────

CREATE TABLE IF NOT EXISTS bug_reports (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Nullable : un visiteur non connecté doit pouvoir signaler un bug.
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description     TEXT NOT NULL,
  -- Objet du bucket Storage privé "bug-screenshots" (créé plus bas).
  screenshot_url  TEXT,
  page_url        TEXT NOT NULL,
  user_agent      TEXT,
  -- Structure libre : { screen: {w,h}, viewport: {w,h}, dpr, lang, tz... }
  browser_context JSONB,
  status          TEXT NOT NULL DEFAULT 'nouveau'
                    CHECK (status IN ('nouveau', 'en_analyse', 'en_correction', 'corrige', 'rejete', 'besoin_precision')),
  severity        TEXT NOT NULL DEFAULT 'non_classee'
                    CHECK (severity IN ('non_classee', 'mineur', 'moyen', 'critique')),
  -- Colonnes remplies plus tard par l'agent IA
  ai_diagnosis    TEXT,
  ai_plan         TEXT,
  ai_report       TEXT,
  commit_sha      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Rattrapage si une version antérieure de la table existe déjà en base.
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS screenshot_url  TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS user_agent      TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS browser_context JSONB;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_diagnosis    TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_plan         TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS ai_report       TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS commit_sha      TEXT;
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────── Index ───────────────────────────────
-- Liste admin : filtre par statut + tri antéchronologique.

CREATE INDEX IF NOT EXISTS bug_reports_status_idx   ON bug_reports(status);
CREATE INDEX IF NOT EXISTS bug_reports_created_idx  ON bug_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS bug_reports_user_idx     ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS bug_reports_severity_idx ON bug_reports(severity);

-- ───────────────────────── updated_at automatique ─────────────────────────
-- Utile dès que l'agent IA écrira ai_diagnosis / ai_plan / status.

CREATE OR REPLACE FUNCTION bug_reports_touch_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bug_reports_set_updated_at ON bug_reports;
CREATE TRIGGER bug_reports_set_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW EXECUTE FUNCTION bug_reports_touch_updated_at();

-- ──────────────────────────────── RLS ────────────────────────────────

ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Insertion : un connecté ne peut créer que SON ticket ; un anonyme ne peut
-- créer qu'un ticket sans propriétaire (user_id NULL).
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'bug_reports_insert'
  ) THEN
    CREATE POLICY "bug_reports_insert" ON bug_reports
      FOR INSERT WITH CHECK (
        (auth.uid() IS NOT NULL AND user_id = auth.uid())
        OR (auth.uid() IS NULL AND user_id IS NULL)
      );
  END IF;
END
$pol$;

-- Lecture : chacun voit ses propres tickets.
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'bug_reports_select_own'
  ) THEN
    CREATE POLICY "bug_reports_select_own" ON bug_reports
      FOR SELECT USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
  END IF;
END
$pol$;

-- Les admins voient et modifient tout (même pattern que reports, migration 06).
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'bug_reports_admin_all'
  ) THEN
    CREATE POLICY "bug_reports_admin_all" ON bug_reports
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END
$pol$;

-- Les policies ne servent à rien sans les GRANT sous-jacents.
GRANT INSERT                 ON bug_reports TO anon;
GRANT SELECT, INSERT, UPDATE ON bug_reports TO authenticated;

-- ─────────────────── Bucket Storage "bug-screenshots" ───────────────────
-- Privé : une capture d'écran de bug peut contenir des données personnelles
-- (messages, dossier, coordonnées). La lecture passe donc par une URL signée
-- côté admin, jamais par une URL publique.

INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Dépôt d'une capture par n'importe quel rapporteur (connecté ou non).
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bug_screenshots_insert'
  ) THEN
    CREATE POLICY "bug_screenshots_insert" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'bug-screenshots');
  END IF;
END
$pol$;

-- Lecture : le propriétaire de son dossier <uid>/... et les admins.
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bug_screenshots_read'
  ) THEN
    CREATE POLICY "bug_screenshots_read" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'bug-screenshots' AND (
          (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)
          OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
        )
      );
  END IF;
END
$pol$;

-- Ménage réservé aux admins (le rapporteur n'a pas à réécrire sa preuve).
DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bug_screenshots_admin_update'
  ) THEN
    CREATE POLICY "bug_screenshots_admin_update" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'bug-screenshots'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END
$pol$;

DO $pol$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'bug_screenshots_admin_delete'
  ) THEN
    CREATE POLICY "bug_screenshots_admin_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'bug-screenshots'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END
$pol$;

-- ───────────────────────── Rechargement PostgREST ─────────────────────────

NOTIFY pgrst, 'reload schema';
