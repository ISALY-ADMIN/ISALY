-- Migration 19: lien contrat -> bien (listing) pour le dashboard bailleur
-- Permet de calculer le statut occupé/libre par annonce et de regrouper les onglets bailleur par contrat.

ALTER TABLE leases
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id);
