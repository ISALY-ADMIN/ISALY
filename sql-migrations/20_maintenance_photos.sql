-- Migration 20: plusieurs photos par signalement de maintenance (max 3 côté UI)
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';
