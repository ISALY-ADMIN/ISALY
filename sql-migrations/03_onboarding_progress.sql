-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 03 — Sauvegarde serveur de l'onboarding
-- À exécuter dans le Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_draft JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 0;
