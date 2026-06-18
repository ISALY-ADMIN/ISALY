-- Migration 16: stockage de documents par contrat + générateur de bail avec signature électronique

CREATE TABLE IF NOT EXISTS lease_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES leases(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  document_type TEXT,
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('final', 'pending_signature', 'signed')),
  token UUID,
  bail_data JSONB,
  owner_signature TEXT,
  tenant_signature TEXT,
  owner_signed_at TIMESTAMPTZ,
  tenant_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_documents_lease_id ON lease_documents(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_documents_token ON lease_documents(token);

ALTER TABLE lease_documents ENABLE ROW LEVEL SECURITY;

-- Bailleur : lecture/écriture sur les documents de ses propres baux
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lease_documents' AND policyname = 'lease_documents_owner_all') THEN
    CREATE POLICY "lease_documents_owner_all" ON lease_documents
      FOR ALL USING (
        EXISTS (SELECT 1 FROM leases WHERE leases.id = lease_documents.lease_id AND leases.owner_id = auth.uid())
      );
  END IF;
END
$$;

-- Locataires du bail : lecture seule
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lease_documents' AND policyname = 'lease_documents_tenant_read') THEN
    CREATE POLICY "lease_documents_tenant_read" ON lease_documents
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM leases WHERE leases.id = lease_documents.lease_id AND leases.tenant_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM lease_roommates WHERE lease_roommates.lease_id = lease_documents.lease_id AND lease_roommates.profile_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- NB : l'accès public à la page /bail/[token] passe par une route API dédiée
-- utilisant la clé service_role (le jeton est vérifié côté serveur), pas par RLS anonyme.

-- Bucket de stockage privé pour les documents bailleur
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents-bailleur', 'documents-bailleur', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'documents_bailleur_auth_all'
  ) THEN
    CREATE POLICY "documents_bailleur_auth_all" ON storage.objects
      FOR ALL USING (bucket_id = 'documents-bailleur' AND auth.role() = 'authenticated');
  END IF;
END
$$;
