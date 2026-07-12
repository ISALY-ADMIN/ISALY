-- Migration 33 : lien swipe → annonce + garanties admin
-- À exécuter dans le SQL editor Supabase (idempotent).

-- ── 1. swipes.listing_id ─────────────────────────────────────
-- L'API /api/swipe envoie déjà listing_id (optionnel) ; la colonne
-- n'existait dans aucune migration → stats "likes par annonce".
ALTER TABLE swipes ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_swipes_listing ON swipes(listing_id) WHERE listing_id IS NOT NULL;

-- ── 2. Garanties admin (déjà présentes en prod, on sécurise) ─
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Index pour la file de validation des documents
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_reviews_reported ON user_reviews(reported) WHERE reported = TRUE;

NOTIFY pgrst, 'reload schema';
