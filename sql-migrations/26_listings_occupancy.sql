-- Places X/Y sur les annonces : occupants actuels + capacité totale de la colocation.
-- occupants_current : personnes déjà dans l'appart (le loueur compte pour 1).
-- capacity_total : nombre total de places ; NULL = déduit de rooms_available côté app.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS occupants_current INTEGER NOT NULL DEFAULT 1;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS capacity_total INTEGER;
