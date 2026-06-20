-- Migration 21: montant des charges et dépôt de garantie sur le bail (page Mes baux)
ALTER TABLE leases ADD COLUMN IF NOT EXISTS charges_amount NUMERIC;
ALTER TABLE leases ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC;
