-- Migration 22: abonnement Swiper+ (swipes/messages illimités)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS swiper_plus_active BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS swiper_plus_expires_at TIMESTAMPTZ;
