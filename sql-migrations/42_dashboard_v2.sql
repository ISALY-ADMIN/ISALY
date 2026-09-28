-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 42 : dashboard v2 (parcours du logement, agences partenaires,
-- abonnement autogestion).
--
-- À coller dans Supabase Dashboard > SQL Editor. Jamais exécutée par un script.
-- Idempotente : ré-exécutable sans effet de bord. Aucune suppression, aucune
-- donnée insérée.
--
-- Le code fonctionne AVANT cette migration : tant qu'une colonne ou une table
-- manque, il se replie (lib/schemaFallback.ts, lib/managementMode.ts,
-- lib/autogestion.ts).
--
-- Contenu :
--   1. partner_agencies : agences partenaires, lisibles par les utilisateurs
--      connectés quand active = true.
--   2. listings (table qui porte le logement) : management_mode,
--      partner_agency_id, delegated_at.
--   3. delegations : transmission d'un dossier à une agence, sert à facturer
--      la commission unique à l'agence (jamais au bailleur ni au locataire).
--      Lecture par le bailleur du logement ; écriture côté serveur uniquement
--      (clé de service, aucune politique d'écriture).
--   4. profiles : autogestion_status, autogestion_subscription_id,
--      autogestion_period_end (abonnement du bailleur, tenu par le webhook).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Agences partenaires ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_agencies (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  city          TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  opening_hours TEXT,
  active        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_agencies_city_active
  ON partner_agencies (lower(city)) WHERE active;

ALTER TABLE partner_agencies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'partner_agencies'
       AND policyname = 'partner_agencies_select_active'
  ) THEN
    CREATE POLICY "partner_agencies_select_active" ON partner_agencies
      FOR SELECT TO authenticated
      USING (active = true);
  END IF;
END $$;

-- ── 2. Parcours du logement, sur listings ────────────────────────────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS management_mode TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS partner_agency_id UUID REFERENCES partner_agencies(id);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_management_mode_check'
  ) THEN
    ALTER TABLE listings
      ADD CONSTRAINT listings_management_mode_check
      CHECK (management_mode IS NULL OR management_mode IN ('autogestion', 'delegue'));
  END IF;
END $$;

COMMENT ON COLUMN listings.management_mode IS
  'Parcours du logement : autogestion (géré avec ISALY), delegue (confié à une agence partenaire, lecture seule) ou NULL (pas encore choisi).';
COMMENT ON COLUMN listings.partner_agency_id IS 'Agence partenaire à qui le logement est confié (management_mode = delegue).';
COMMENT ON COLUMN listings.delegated_at IS 'Date de transmission du dossier à l''agence partenaire.';

-- Reprise : un logement qui a déjà un bail actif est en autogestion.
UPDATE listings li
   SET management_mode = 'autogestion'
 WHERE li.management_mode IS NULL
   AND EXISTS (
     SELECT 1 FROM leases l
      WHERE l.listing_id = li.id
        AND l.status = 'active'
   );

-- ── 3. Transmissions de dossier à une agence ─────────────────────────────
CREATE TABLE IF NOT EXISTS delegations (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id        UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  tenant_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  agency_id         UUID NOT NULL REFERENCES partner_agencies(id),
  transmitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  commission_status TEXT NOT NULL DEFAULT 'a_facturer'
    CHECK (commission_status IN ('a_facturer', 'facturee', 'payee'))
);

CREATE INDEX IF NOT EXISTS idx_delegations_listing ON delegations(listing_id);
CREATE INDEX IF NOT EXISTS idx_delegations_agency  ON delegations(agency_id);

ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;

-- Lecture par le bailleur du logement. Pas de politique d'écriture : seules
-- les routes serveur (clé de service) créent ou mettent à jour une ligne.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'delegations'
       AND policyname = 'delegations_select_owner'
  ) THEN
    CREATE POLICY "delegations_select_owner" ON delegations
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM listings li
           WHERE li.id = delegations.listing_id
             AND li.owner_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── 4. Abonnement autogestion du bailleur, sur profiles ──────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autogestion_status TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autogestion_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS autogestion_period_end TIMESTAMPTZ;

COMMENT ON COLUMN profiles.autogestion_status IS
  'Statut Stripe de l''abonnement autogestion (active, trialing, past_due, canceled…). Tenu par le webhook.';
COMMENT ON COLUMN profiles.autogestion_subscription_id IS 'Identifiant de l''abonnement Stripe autogestion.';
COMMENT ON COLUMN profiles.autogestion_period_end IS 'Fin de la période payée de l''abonnement autogestion.';

-- Note : aucune politique ne croise leases et lease_roommates dans cette
-- migration, aucune fonction SECURITY DEFINER n'est donc nécessaire.

-- ── Exemple (NE PAS exécuter tel quel) : ajouter une agence partenaire ────
-- INSERT INTO partner_agencies (name, city, phone, email, address, opening_hours, active)
-- VALUES (
--   'Nom de l''agence',
--   'Lyon',
--   '04 00 00 00 00',
--   'contact@agence.fr',
--   '1 rue de l''Exemple, 69000 Lyon',
--   'Du lundi au vendredi, de 9 h à 18 h',
--   true
-- );
