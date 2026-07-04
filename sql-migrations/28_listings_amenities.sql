-- Migration 28 : critères de vie sur les annonces (filtres recherche).
-- NULL = non renseigné par le loueur (les filtres ne matchent que les annonces
-- explicitement marquées true).

ALTER TABLE listings ADD COLUMN IF NOT EXISTS meuble BOOLEAN;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS animaux_ok BOOLEAN;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS non_fumeur BOOLEAN;

COMMENT ON COLUMN listings.meuble IS 'Logement meublé (NULL = non renseigné)';
COMMENT ON COLUMN listings.animaux_ok IS 'Animaux acceptés (NULL = non renseigné)';
COMMENT ON COLUMN listings.non_fumeur IS 'Logement non-fumeur (NULL = non renseigné)';
