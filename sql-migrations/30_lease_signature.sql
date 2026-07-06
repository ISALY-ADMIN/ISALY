-- Migration 30 (fusionnée) : table lease_roommates + signature électronique de bail
-- - lease_roommates : membres additionnels d'un bail (module "Mes colocataires")
-- - PDF du bail dans un bucket privé "leases"
-- - signatures JSONB { signed_at, signature_data, ip, consent } par partie
-- - statuts étendus : draft | pending_signature | active | ended
-- - consignes du logement (house_rules) affichées dans "Ma maison"
--
-- NB : leases et lease_roommates se référencent dans leurs policies RLS.
-- Les fonctions SECURITY DEFINER ci-dessous contournent le RLS interne et
-- évitent l'erreur "infinite recursion detected in policy".

-- ── 0. Table lease_roommates ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS lease_roommates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lease_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_lease_roommates_lease_id ON lease_roommates(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_roommates_profile_id ON lease_roommates(profile_id);

-- ── 0b. Helpers anti-récursion RLS ───────────────────────────────
CREATE OR REPLACE FUNCTION is_lease_party(l_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM leases WHERE id = l_id AND (tenant_id = auth.uid() OR owner_id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION is_lease_owner(l_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM leases WHERE id = l_id AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_lease_roommate(l_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM lease_roommates WHERE lease_id = l_id AND profile_id = auth.uid());
$$;

-- ── 0c. RLS lease_roommates ──────────────────────────────────────
ALTER TABLE lease_roommates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lease_roommates' AND policyname = 'lease_roommates_select') THEN
    -- Visible par : le membre lui-même, les parties du bail (loueur/locataire principal),
    -- et les autres colocataires du même bail.
    CREATE POLICY "lease_roommates_select" ON lease_roommates FOR SELECT
      USING (profile_id = auth.uid() OR is_lease_party(lease_id) OR is_lease_roommate(lease_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lease_roommates' AND policyname = 'lease_roommates_owner_insert') THEN
    CREATE POLICY "lease_roommates_owner_insert" ON lease_roommates FOR INSERT
      WITH CHECK (is_lease_owner(lease_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lease_roommates' AND policyname = 'lease_roommates_owner_delete') THEN
    CREATE POLICY "lease_roommates_owner_delete" ON lease_roommates FOR DELETE
      USING (is_lease_owner(lease_id));
  END IF;
END
$$;

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

-- ── 3. RLS leases : chaque partie + colocataires voient le bail ──
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leases' AND policyname = 'leases_parties_select') THEN
    CREATE POLICY "leases_parties_select" ON leases FOR SELECT
      USING (auth.uid() = tenant_id OR auth.uid() = owner_id OR is_lease_roommate(id));
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
-- Seuls le locataire, le loueur et les colocataires du bail accèdent aux objets.
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
            AND (l.tenant_id = auth.uid() OR l.owner_id = auth.uid() OR public.is_lease_roommate(l.id))
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
