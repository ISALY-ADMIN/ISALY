-- Migration 24: boost des annonces (tier, expiration, subscription Stripe)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS boost_tier TEXT DEFAULT 'standard'
  CHECK (boost_tier IN ('standard', 'featured', 'priority'));

ALTER TABLE listings ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS boost_stripe_subscription_id TEXT;

COMMENT ON COLUMN listings.boost_tier IS 'Niveau de boost actif : standard | featured | priority';
COMMENT ON COLUMN listings.boost_expires_at IS 'Date d''expiration du boost payant';
COMMENT ON COLUMN listings.boost_stripe_subscription_id IS 'ID abonnement Stripe lié au boost';
