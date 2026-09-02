-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 38 : intent loueur collecté à l'onboarding
--
-- Contexte : l'onboarding pose désormais une branche dédiée quand la question
-- de rôle (migration 37) reçoit « Je loue un bien ». Trois questions y sont
-- posées — à quel moment le loueur a un bien à publier, le type de bien, les
-- villes visées — puis le parcours l'envoie directement sur /app/annonce.
--
-- Ces réponses n'ont aucune colonne existante où atterrir : `matching_data`
-- est le vecteur de compatibilité colocataire (typé MatchingData côté code) et
-- `onboarding_draft` est vidé en fin de parcours. Une colonne JSONB dédiée
-- évite d'en polluer une autre et permet de rappeler le loueur là où il en
-- était (relance « bientôt », ciblage des villes ouvertes).
--
-- Le code écrit cette colonne de façon best-effort, dans une requête séparée
-- de l'upsert principal : tant que cette migration n'est pas jouée,
-- l'onboarding loueur se termine normalement, seul l'intent est perdu.
--
-- À exécuter dans Supabase Dashboard > SQL Editor.
-- Idempotent : ré-exécutable sans effet de bord.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────── Colonne ───────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS owner_intent JSONB;

COMMENT ON COLUMN profiles.owner_intent IS
  'Réponses de la branche loueur de l''onboarding : { timing, property_type, cities[], answered_at }. NULL pour un locataire et pour tout compte antérieur à la migration 38.';

-- ─────────────────────────────── Index ───────────────────────────────
-- Index partiel : seuls les loueurs ayant répondu portent une valeur, la
-- très grande majorité des lignes reste NULL et n'est pas indexée.

CREATE INDEX IF NOT EXISTS profiles_owner_intent_idx
  ON profiles USING GIN (owner_intent)
  WHERE owner_intent IS NOT NULL;

-- ──────────────────── Comptes existants : aucun backfill ────────────────────
-- Volontairement AUCUN backfill : on ne peut pas deviner l'intent d'un loueur
-- déjà inscrit. Il garde owner_intent = NULL, ce que le code interprète
-- simplement comme « question jamais posée » — sans jamais la lui reposer,
-- son onboarding étant déjà terminé.

-- ───────────────────────── Rechargement PostgREST ─────────────────────────

NOTIFY pgrst, 'reload schema';
