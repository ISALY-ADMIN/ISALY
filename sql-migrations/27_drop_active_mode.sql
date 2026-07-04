-- Migration 27 : profiles.role devient LA colonne de référence du mode
-- ('locataire' | 'loueur', NULL = locataire par défaut).
-- active_mode (créée en migration 14) est supprimée après migration des valeurs.

-- Reporter le mode actif dans role avant suppression
UPDATE profiles SET role = active_mode
WHERE active_mode IS NOT NULL AND (role IS NULL OR role <> active_mode);

ALTER TABLE profiles DROP COLUMN IF EXISTS active_mode;
