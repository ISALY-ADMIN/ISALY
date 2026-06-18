-- Migration 15: échéances et reçus pour la vue bailleur de l'onglet "Mes loyers"
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
