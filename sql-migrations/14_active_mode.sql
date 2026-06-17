-- Migration 14: Add active_mode column to profiles
-- Allows each user to persist their active UI mode (locataire / loueur)
-- Run once on Supabase SQL editor before deploying the mode-switcher feature

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_mode TEXT NOT NULL DEFAULT 'locataire'
  CHECK (active_mode IN ('locataire', 'loueur'));
