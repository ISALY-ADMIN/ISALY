-- Migration 31 : coffre-fort de documents + bail loi 89 complet
-- - leases.bail_data : JSON complet du formulaire loi 89 (regénération PDF fidèle)
-- - profiles.vault_pin_hash : PIN du coffre-fort (scrypt salt:hash, jamais en clair)
-- - table documents : métadonnées du coffre-fort (RLS owner-only)
-- - bucket privé "vault" : fichiers du coffre-fort, chemin {user_id}/..., owner-only

-- ── 1. Colonnes ──────────────────────────────────────────────────
ALTER TABLE leases   ADD COLUMN IF NOT EXISTS bail_data JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vault_pin_hash TEXT;

-- ── 2. Table documents (coffre-fort) ─────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES leases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'autres'
    CHECK (category IN ('bail', 'quittances', 'etat_des_lieux', 'identite', 'revenus', 'autres')),
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'documents_owner_all') THEN
    CREATE POLICY "documents_owner_all" ON documents FOR ALL
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

-- ── 3. Bucket privé "vault" (owner-only, chemin {user_id}/fichier) ─
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'vault_owner_select'
  ) THEN
    CREATE POLICY "vault_owner_select" ON storage.objects FOR SELECT
      USING (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'vault_owner_insert'
  ) THEN
    CREATE POLICY "vault_owner_insert" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'vault_owner_delete'
  ) THEN
    CREATE POLICY "vault_owner_delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'vault' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
