-- Migration 30: signature électronique de bail intégrée (Mission bail)
-- - PDF du bail dans un bucket privé "leases"
-- - signatures JSONB { signed_at, signature_data, ip, consent } par partie
-- - statuts étendus : draft | pending_signature | active | ended
-- - consignes du logement (house_rules) affichées dans "Ma maison"

-- ── 1. Colonnes leases ───────────────────────────────────────────
ALTER TABLE leases ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS tenant_signature JSONB;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS owner_signature JSONB;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS house_rules TEXT;
-- rent = monthly_rent, deposit = deposit_amount (migration 21), listing_id (migration 19),
-- start_date / end_date déjà présents dans le schéma initial.

-- ── 2. Statuts étendus ───────────────────────────────────────────
-- Les anciens baux 'pending' deviennent 'pending_signature'.
UPDATE leases SET status = 'pending_signature' WHERE status = 'pending';
ALTER TABLE leases DROP CONSTRAINT IF EXISTS leases_status_check;
ALTER TABLE leases ADD CONSTRAINT leases_status_check
  CHECK (status IN ('draft', 'pending_signature', 'active', 'ended'));

-- ── 3. RLS leases : chaque partie voit ses baux, le loueur crée/édite ──
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leases' AND policyname = 'leases_parties_select') THEN
    CREATE POLICY "leases_parties_select" ON leases FOR SELECT
      USING (auth.uid() = tenant_id OR auth.uid() = owner_id
             OR EXISTS (SELECT 1 FROM lease_roommates lr WHERE lr.lease_id = leases.id AND lr.profile_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leases' AND policyname = 'leases_owner_insert') THEN
    CREATE POLICY "leases_owner_insert" ON leases FOR INSERT WITH CHECK (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leases' AND policyname = 'leases_parties_update') THEN
    -- La signature du locataire passe par une mise à jour de sa propre ligne ;
    -- les colonnes modifiables sont contrôlées côté API.
    CREATE POLICY "leases_parties_update" ON leases FOR UPDATE
      USING (auth.uid() = tenant_id OR auth.uid() = owner_id);
  END IF;
END
$$;

-- ── 4. Bucket privé "leases" (PDF de bail + états des lieux) ─────
INSERT INTO storage.buckets (id, name, public)
VALUES ('leases', 'leases', false)
ON CONFLICT (id) DO NOTHING;

-- Convention de chemin : {lease_id}/nom-du-fichier.pdf
-- Seuls le locataire et le loueur du bail accèdent aux objets.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'leases_bucket_parties_select'
  ) THEN
    CREATE POLICY "leases_bucket_parties_select" ON storage.objects FOR SELECT
      USING (
        bucket_id = 'leases' AND EXISTS (
          SELECT 1 FROM public.leases l
          WHERE l.id::text = (storage.foldername(name))[1]
            AND (l.tenant_id = auth.uid() OR l.owner_id = auth.uid()
                 OR EXISTS (SELECT 1 FROM public.lease_roommates lr WHERE lr.lease_id = l.id AND lr.profile_id = auth.uid()))
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'leases_bucket_parties_insert'
  ) THEN
    CREATE POLICY "leases_bucket_parties_insert" ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'leases' AND EXISTS (
          SELECT 1 FROM public.leases l
          WHERE l.id::text = (storage.foldername(name))[1]
            AND (l.tenant_id = auth.uid() OR l.owner_id = auth.uid())
        )
      );
  END IF;
END
$$;
