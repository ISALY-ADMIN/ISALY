-- Migration 17: suivi bailleur des signalements de maintenance
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS bailleur_comment TEXT;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS resolved_photo_url TEXT;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS photo_url TEXT;
