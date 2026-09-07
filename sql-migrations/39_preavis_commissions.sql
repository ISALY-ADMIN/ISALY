-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 39 : préavis locataire + commission de gestion PAR PERSONNE
--
-- Contexte : la commission de 2,5 %/mois n'est branchée à aucun paiement réel
-- (BILLING_ENABLED = false, lib/billing.ts). Aucun abonnement Stripe de type
-- « assurance » n'existe donc en production. C'est le moment le moins coûteux
-- pour poser la bonne structure : UN enregistrement de commission PAR
-- LOCATAIRE, et non un seul partagé par bail. Sans cela, le départ d'un seul
-- colocataire ne peut pas interrompre sa seule part.
--
-- Trois règles métier couvertes :
--   1. Fin normale du bail  -> arrêt automatique à leases.end_date.
--   2. Départ anticipé      -> le locataire déclare son préavis ; le délai légal
--      (1 mois meublé / 3 mois non meublé) est calculé depuis la déclaration.
--   3. Colocation           -> seule la part du partant s'arrête.
--
-- À exécuter dans Supabase Dashboard > SQL Editor.
-- Idempotent : ré-exécutable sans effet de bord. Aucune suppression de donnée.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Type de logement figé sur le bail ─────────────────────────
-- `listings.meuble` existe déjà, mais il porte sur l'ANNONCE : elle peut être
-- modifiée ou déliée (leases.listing_id est nullable) après la signature.
-- Le régime du bail est donc recopié ici, et sert de source de vérité pour le
-- calcul du délai de préavis.
ALTER TABLE leases ADD COLUMN IF NOT EXISTS meuble BOOLEAN;

COMMENT ON COLUMN leases.meuble IS
  'Regime du bail : true = meuble (preavis 1 mois), false = non meuble (3 mois), NULL = inconnu (declare par le locataire au moment du preavis).';

-- Reprise best-effort depuis l'annonce liée, sans écraser une valeur déjà posée.
UPDATE leases l
   SET meuble = li.meuble
  FROM listings li
 WHERE l.listing_id = li.id
   AND l.meuble IS NULL
   AND li.meuble IS NOT NULL;

-- ── 2. Commission de gestion, un enregistrement par locataire ────
CREATE TABLE IF NOT EXISTS lease_commissions (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id               UUID NOT NULL REFERENCES leases(id)   ON DELETE CASCADE,
  tenant_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Taux appliqué, figé à la création (2,5 % aujourd'hui).
  rate                   NUMERIC NOT NULL DEFAULT 0.025,
  -- Part de loyer imputée à ce locataire : loyer du bail / nombre d'occupants.
  -- Figée à la création pour qu'un départ ne recalcule pas la part des autres.
  share_rent             NUMERIC,
  commission_active      BOOLEAN NOT NULL DEFAULT true,
  started_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stopped_at             TIMESTAMPTZ,
  -- Pourquoi la commission s'est arrêtée — auditable une fois la facturation
  -- réactivée : fin de bail, préavis du locataire, ou geste manuel admin.
  stop_reason            TEXT CHECK (stop_reason IN ('lease_end', 'preavis', 'lease_ended_status', 'manual')),
  -- Renseigné plus tard, quand BILLING_ENABLED repassera à true.
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lease_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_lease_commissions_lease  ON lease_commissions(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_commissions_tenant ON lease_commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_commissions_active ON lease_commissions(commission_active) WHERE commission_active;

-- ── 3. Préavis déposé par le locataire ───────────────────────────
CREATE TABLE IF NOT EXISTS preavis (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id           UUID NOT NULL REFERENCES leases(id)   ON DELETE CASCADE,
  tenant_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Horodatée par le serveur, jamais saisie par le locataire.
  date_declaration   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- date_declaration + delai_mois, calculée serveur et affichée avant confirmation.
  date_fin_effective DATE NOT NULL,
  -- Copié au moment de la déclaration : garde la trace du régime appliqué même
  -- si l'annonce ou le bail sont modifiés plus tard.
  type_logement      TEXT NOT NULL CHECK (type_logement IN ('meuble', 'non_meuble')),
  delai_mois         INTEGER NOT NULL CHECK (delai_mois IN (1, 3)),
  -- active = en cours · cancelled = rétracté avant la date effective
  -- applied = date effective atteinte, la commission du locataire a été arrêtée
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'applied')),
  cancelled_at       TIMESTAMPTZ,
  applied_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preavis_lease  ON preavis(lease_id);
CREATE INDEX IF NOT EXISTS idx_preavis_tenant ON preavis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_preavis_due    ON preavis(date_fin_effective) WHERE status = 'active';

-- Un seul préavis en cours par locataire et par bail. Les préavis rétractés
-- restent en base (historique) et n'entrent pas dans la contrainte.
CREATE UNIQUE INDEX IF NOT EXISTS idx_preavis_one_active
  ON preavis(lease_id, tenant_id) WHERE status = 'active';

-- ── 4. RLS ───────────────────────────────────────────────────────
-- Réutilise les helpers SECURITY DEFINER de la migration 30
-- (is_lease_party / is_lease_owner / is_lease_roommate) : ils évitent la
-- récursion infinie entre les policies de leases et lease_roommates.
ALTER TABLE lease_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE preavis           ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- lease_commissions : lecture seule côté utilisateur. Le locataire voit sa
  -- part, le loueur voit celles de son bail. Toute écriture passe par le
  -- service role (cron + routes API), qui contourne le RLS.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lease_commissions' AND policyname = 'lease_commissions_select') THEN
    CREATE POLICY "lease_commissions_select" ON lease_commissions FOR SELECT
      USING (tenant_id = auth.uid() OR is_lease_owner(lease_id));
  END IF;

  -- preavis : visible par son auteur et par les parties du bail (le loueur doit
  -- voir le préavis qui le concerne).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preavis' AND policyname = 'preavis_select') THEN
    CREATE POLICY "preavis_select" ON preavis FOR SELECT
      USING (tenant_id = auth.uid() OR is_lease_party(lease_id));
  END IF;

  -- Seul le locataire dépose son propre préavis, et seulement s'il est
  -- effectivement partie au bail (titulaire ou colocataire).
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preavis' AND policyname = 'preavis_tenant_insert') THEN
    CREATE POLICY "preavis_tenant_insert" ON preavis FOR INSERT
      WITH CHECK (tenant_id = auth.uid() AND (is_lease_party(lease_id) OR is_lease_roommate(lease_id)));
  END IF;

  -- Rétractation : le locataire modifie sa propre ligne (passage en 'cancelled').
  -- Les colonnes réellement modifiables sont contrôlées côté API.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'preavis' AND policyname = 'preavis_tenant_update') THEN
    CREATE POLICY "preavis_tenant_update" ON preavis FOR UPDATE
      USING (tenant_id = auth.uid());
  END IF;
END
$$;

-- ── 5. Rechargement du cache de schéma PostgREST ─────────────────
NOTIFY pgrst, 'reload schema';
