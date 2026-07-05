-- ═══════════════════════════════════════════════════════════════
-- ISALY — Refonte profil locataire : vérification & dossier
-- À exécuter dans le Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Colonnes profiles ─────────────────────────────────────
-- Niveau de certification (0..3), lu par le swipe et le profil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cert_level INTEGER DEFAULT 0;
-- Préférences coloc additionnelles (n'altère pas matching_data)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoker BOOLEAN;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pets_ok BOOLEAN;

-- ── 2. user_documents : alignement du modèle ─────────────────
-- La table existe déjà (voir schema.sql). On garantit les colonnes
-- utilisées par le nouveau flux d'upload et l'unicité par type.
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Un seul document actif par (utilisateur, type) → re-upload = remplacement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_documents_user_type_uniq'
  ) THEN
    ALTER TABLE user_documents
      ADD CONSTRAINT user_documents_user_type_uniq UNIQUE (user_id, type);
  END IF;
END $$;

-- RLS déjà en place (docs_all : owner-only). On la garantit.
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "docs_all" ON user_documents;
CREATE POLICY "docs_all" ON user_documents
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 3. Bucket privé pour les documents de vérification ───────
-- JAMAIS public : accès via signed URLs uniquement.
INSERT INTO storage.buckets (id, name, public)
VALUES ('certifications', 'certifications', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS storage : chaque user n'accède qu'à son dossier {user_id}/…
DROP POLICY IF EXISTS "cert_objects_select_own" ON storage.objects;
CREATE POLICY "cert_objects_select_own" ON storage.objects FOR SELECT
  USING (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "cert_objects_insert_own" ON storage.objects;
CREATE POLICY "cert_objects_insert_own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "cert_objects_update_own" ON storage.objects;
CREATE POLICY "cert_objects_update_own" ON storage.objects FOR UPDATE
  USING (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "cert_objects_delete_own" ON storage.objects;
CREATE POLICY "cert_objects_delete_own" ON storage.objects FOR DELETE
  USING (bucket_id = 'certifications' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ── 4. Bucket avatars public (garanti) ───────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_owner_write" ON storage.objects;
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
