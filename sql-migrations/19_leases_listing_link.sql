-- Migration 19: lien contrat -> bien (listing) pour le dashboard bailleur
-- Permet de calculer le statut occupé/libre par annonce et de regrouper les onglets bailleur par contrat.

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;

-- Force PostgREST à recharger son cache de schéma (sinon "Could not find the 'listing_id' column ... in the schema cache")
NOTIFY pgrst, 'reload schema';
