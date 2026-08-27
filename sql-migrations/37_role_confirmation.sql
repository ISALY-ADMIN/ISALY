-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 37 : confirmation explicite du rôle (locataire / loueur)
--
-- Contexte : le pivot 100% locataire est annulé. Le rôle redevient un vrai
-- choix, posé par la question d'onboarding « Tu es plutôt… ».
--
-- profiles.role existait déjà mais ne dit pas SI l'utilisateur a répondu à
-- cette question : un compte créé pendant le pivot a role = 'locataire' sans
-- l'avoir jamais choisi, et un compte plus ancien peut avoir un rôle hérité.
-- role_confirmed_at tranche : NULL = n'a jamais répondu, on lui repose la
-- question de façon bloquante à la prochaine connexion.
--
-- À exécuter dans Supabase Dashboard > SQL Editor.
-- Idempotent : ré-exécutable sans effet de bord.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────── Colonne ───────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.role_confirmed_at IS
  'Date à laquelle l''utilisateur a répondu à la question de rôle de l''onboarding. NULL = jamais répondu, la question lui est reposée de façon bloquante.';

-- ─────────────────────────────── Index ───────────────────────────────
-- La garde de rôle interroge « role_confirmed_at IS NULL » à chaque entrée
-- dans /app/* : un index partiel garde ce test constant quand la table grossit.

CREATE INDEX IF NOT EXISTS profiles_role_unconfirmed_idx
  ON profiles (id)
  WHERE role_confirmed_at IS NULL;

-- ──────────────────── Comptes existants : rien à confirmer ────────────────────
-- Volontairement AUCUN backfill : tous les comptes déjà en base gardent
-- role_confirmed_at = NULL et se verront donc reposer la question une fois.
-- C'est exactement le comportement demandé — y compris pour les comptes que
-- le pivot avait forcés à 'locataire' sans leur demander leur avis.
--
-- Seule exception, le compte à double vue : il n'est jamais bloqué par la
-- question (l'exception est portée par le code, pas par la base), mais on lui
-- pose tout de même un horodatage pour que son état soit cohérent en base.
UPDATE profiles
   SET role_confirmed_at = NOW()
 WHERE lower(email) = 'isaly.register@gmail.com'
   AND role_confirmed_at IS NULL;

-- ───────────────────────── Rechargement PostgREST ─────────────────────────

NOTIFY pgrst, 'reload schema';
