-- Migration 34 : missions 14-18 (vérification identité Stripe, recherche urgente, garant digital)

-- ── Mission 14 : vérification d'identité Stripe Identity ─────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_identity_session_id TEXT;

-- ── Mission 15 : mode recherche urgente ──────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS urgent_search_active BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS urgent_search_expires_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS urgent_search_available_from TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_urgent_search
  ON profiles(urgent_search_active) WHERE urgent_search_active = TRUE;

-- ── Mission 16 : garant digital ──────────────────────────────────
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS garant_name TEXT;
ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS garant_email TEXT;

-- Nouveaux types de document : 'identity' (session Stripe Identity) et 'garant'
ALTER TABLE user_documents DROP CONSTRAINT IF EXISTS user_documents_type_check;
ALTER TABLE user_documents ADD CONSTRAINT user_documents_type_check
  CHECK (type IN ('identity_front', 'identity_back', 'selfie', 'payslip', 'domicile', 'guarantor', 'identity', 'garant'));

NOTIFY pgrst, 'reload schema';
