-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 40 : colocataires déjà en place, visibles depuis une annonce
--
-- Contexte : la page « Trouver » (/app/swipe) ne fait plus swiper des profils
-- mais uniquement des LOGEMENTS. Chaque logement a deux états :
--   • vide    -> aucun colocataire, aucun algorithme, on candidate directement ;
--   • occupé  -> score de compatibilité = moyenne du score du visiteur avec
--                CHAQUE colocataire déjà en place.
--
-- Problème résolu ici : les colocataires d'un logement se déduisent du bail
-- (leases.listing_id -> leases.tenant_id + lease_roommates.profile_id), mais
-- la policy `leases_parties_select` (migration 30) réserve la lecture des baux
-- au locataire et au loueur. Un visiteur qui swipe ne peut donc PAS lire le
-- bail d'une annonce qui ne le concerne pas — et ne doit pas pouvoir le faire :
-- un bail contient loyer réel, adresse exacte, signatures et documents.
--
-- On expose donc le strict nécessaire par une fonction SECURITY DEFINER, sur
-- le modèle de `has_active_lease` / `is_lease_party` (migration 30) : l'identité
-- publique du colocataire (celle déjà affichée sur /app/profil-public) plus son
-- `matching_data`, qui sert au calcul du score. Aucune donnée du bail lui-même
-- ne sort de la fonction : ni loyer, ni adresse, ni dates, ni documents.
--
-- `matching_data` n'est pas une donnée nouvelle pour l'appelant : /api/match le
-- renvoie déjà pour tous les profils visibles (select('*')). Il reste malgré
-- tout consommé côté SERVEUR uniquement (app/api/listings/colocataires), qui ne
-- renvoie au navigateur que des scores agrégés — jamais les réponses au quiz.
--
-- À exécuter dans Supabase Dashboard > SQL Editor.
-- Idempotent : ré-exécutable sans effet de bord. Aucune suppression de donnée.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Colocataires en place d'un lot d'annonces ─────────────────
-- Prend un tableau d'UUID d'annonces (le paquet de cartes du swipe est chargé
-- d'un coup : une seule requête pour toute la pile, pas une par carte).
--
-- « Déjà en place » = partie d'un bail ACTIF rattaché à l'annonce :
--   - le locataire titulaire (leases.tenant_id), et
--   - les colocataires déclarés (lease_roommates.profile_id).
-- Le loueur n'en fait pas partie : il n'habite pas nécessairement le logement,
-- et sa compatibilité n'a pas de sens pour qui cherche une chambre.
--
-- L'appelant est exclu du résultat : on ne se compare pas à soi-même, et un
-- locataire déjà en place ne doit pas voir son propre score sur sa colocation.
CREATE OR REPLACE FUNCTION listing_roommates(l_ids UUID[])
RETURNS TABLE (
  listing_id   UUID,
  profile_id   UUID,
  first_name   TEXT,
  last_name    TEXT,
  avatar_url   TEXT,
  matching_data JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    l.listing_id,
    p.id          AS profile_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.matching_data
  FROM leases l
  JOIN LATERAL (
    SELECT l.tenant_id AS pid
    UNION
    SELECT lr.profile_id FROM lease_roommates lr WHERE lr.lease_id = l.id
  ) parties ON TRUE
  JOIN profiles p ON p.id = parties.pid
  WHERE l.listing_id = ANY(l_ids)
    AND l.status = 'active'
    AND parties.pid IS DISTINCT FROM auth.uid();
$$;

COMMENT ON FUNCTION listing_roommates(UUID[]) IS
  'Colocataires en place (bail actif) des annonces passees en parametre : identite publique + matching_data, pour le calcul du score de compatibilite du swipe. SECURITY DEFINER car les baux sont illisibles hors parties (policy leases_parties_select). N''expose aucune donnee du bail. Appelant exclu du resultat.';

-- Lecture ouverte aux utilisateurs connectés : la fonction ne renvoie que ce
-- qui est déjà public sur une fiche profil, plus le matching_data consommé
-- côté serveur. Les visiteurs anonymes n'ont pas de score à calculer.
REVOKE ALL ON FUNCTION listing_roommates(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION listing_roommates(UUID[]) TO authenticated;

-- ── 2. Remplissage réel d'une annonce ────────────────────────────
-- `listings.occupants_current` (migration 26) est saisi à la main par le loueur
-- et vaut 1 par défaut, y compris pour un logement où personne n'habite encore.
-- Il ne peut donc pas servir à distinguer « vide » de « occupé ».
--
-- Cette vue compte les colocataires RÉELLEMENT rattachés à un bail actif de
-- l'annonce. Elle ne remplace pas occupants_current (qui reste l'affichage
-- déclaratif du loueur) : elle sert à trancher l'état de la carte.
CREATE OR REPLACE VIEW listing_occupancy_real AS
  SELECT
    l.listing_id,
    COUNT(DISTINCT parties.pid) AS occupants_real
  FROM leases l
  JOIN LATERAL (
    SELECT l.tenant_id AS pid
    UNION
    SELECT lr.profile_id FROM lease_roommates lr WHERE lr.lease_id = l.id
  ) parties ON TRUE
  WHERE l.listing_id IS NOT NULL
    AND l.status = 'active'
    AND parties.pid IS NOT NULL
  GROUP BY l.listing_id;

COMMENT ON VIEW listing_occupancy_real IS
  'Nombre de colocataires reellement rattaches a un bail actif, par annonce. Distinct de listings.occupants_current, qui est declaratif (defaut 1).';

-- La vue s'appuie sur `leases`, protégé par RLS : sans SECURITY INVOKER
-- explicite elle hériterait des droits de son créateur. On la garde en
-- lecture indirecte via la fonction ci-dessus plutôt que de l'ouvrir.
REVOKE ALL ON listing_occupancy_real FROM PUBLIC;
REVOKE ALL ON listing_occupancy_real FROM authenticated;

-- ── 3. Index de jointure ─────────────────────────────────────────
-- `listing_roommates` filtre sur leases.listing_id à chaque chargement de pile.
CREATE INDEX IF NOT EXISTS idx_leases_listing_id_active
  ON leases(listing_id) WHERE status = 'active';
