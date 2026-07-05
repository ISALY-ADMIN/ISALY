-- Migration 29 : niveau d'urgence des signalements de maintenance
-- (colonne présente dans schema.sql, sécurisée ici pour les bases déjà déployées)
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS urgency TEXT
  CHECK (urgency IN ('low', 'normal', 'urgent'))
  DEFAULT 'normal';

-- Backfill des lignes existantes sans urgence
UPDATE maintenance_requests SET urgency = 'normal' WHERE urgency IS NULL;
