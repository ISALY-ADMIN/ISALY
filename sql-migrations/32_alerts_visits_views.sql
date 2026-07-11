-- ============================================================
-- ISALY · Migration 32 — Alertes de recherche, créneaux de
-- visite, compteur de vues profil.
-- À exécuter dans le SQL editor Supabase.
-- ============================================================

-- ── 1. Alertes de recherche ─────────────────────────────────
CREATE TABLE IF NOT EXISTS search_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT,
  city TEXT,
  budget_max NUMERIC,
  rooms INTEGER,
  surface_min NUMERIC,
  meuble BOOLEAN,
  animaux_ok BOOLEAN,
  non_fumeur BOOLEAN,
  notify_push BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_alerts_user ON search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_search_alerts_active ON search_alerts(is_active) WHERE is_active = TRUE;

ALTER TABLE search_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "search_alerts_owner" ON search_alerts;
CREATE POLICY "search_alerts_owner" ON search_alerts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 2. Créneaux de visite (disponibilités loueur) ───────────
CREATE TABLE IF NOT EXISTS visit_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  is_booked BOOLEAN DEFAULT FALSE,
  booked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, listing_id, slot_date, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_visit_slots_listing ON visit_slots(listing_id);
CREATE INDEX IF NOT EXISTS idx_visit_slots_owner ON visit_slots(owner_id);
CREATE INDEX IF NOT EXISTS idx_visit_slots_booked_by ON visit_slots(booked_by);

ALTER TABLE visit_slots ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur connecté (les créneaux libres sont publics dans l'app)
DROP POLICY IF EXISTS "visit_slots_select" ON visit_slots;
CREATE POLICY "visit_slots_select" ON visit_slots
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Écriture : le loueur gère ses propres créneaux
DROP POLICY IF EXISTS "visit_slots_insert" ON visit_slots;
CREATE POLICY "visit_slots_insert" ON visit_slots
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "visit_slots_delete" ON visit_slots;
CREATE POLICY "visit_slots_delete" ON visit_slots
  FOR DELETE USING (owner_id = auth.uid());

-- Update : le loueur (gestion), ou un locataire qui réserve un créneau LIBRE
DROP POLICY IF EXISTS "visit_slots_update_owner" ON visit_slots;
CREATE POLICY "visit_slots_update_owner" ON visit_slots
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "visit_slots_book" ON visit_slots;
CREATE POLICY "visit_slots_book" ON visit_slots
  FOR UPDATE USING (is_booked = FALSE AND auth.uid() IS NOT NULL)
  WITH CHECK (booked_by = auth.uid());

-- ── 3. Compteur de vues profil ──────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_views_count INTEGER DEFAULT 0;

-- Journal des vues (rate-limit : 1 vue / user / profil / jour)
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(viewer_id, viewed_id, viewed_on)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_id, created_at);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_views_insert" ON profile_views;
CREATE POLICY "profile_views_insert" ON profile_views
  FOR INSERT WITH CHECK (viewer_id = auth.uid());
DROP POLICY IF EXISTS "profile_views_select_own" ON profile_views;
CREATE POLICY "profile_views_select_own" ON profile_views
  FOR SELECT USING (viewed_id = auth.uid() OR viewer_id = auth.uid());

-- Incrément atomique du compteur (SECURITY DEFINER pour passer la RLS profiles)
CREATE OR REPLACE FUNCTION increment_profile_views(target_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles SET profile_views_count = COALESCE(profile_views_count, 0) + 1
  WHERE id = target_id;
$$;

-- ── 4. Anti-spam notification "dossier incomplet" ───────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_incomplete_nudge_at TIMESTAMPTZ;

-- ── 5. Vues d'annonces (stats loueur + nudge boost) ─────────
ALTER TABLE listings ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS listing_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  viewed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(viewer_id, listing_id, viewed_on)
);

CREATE INDEX IF NOT EXISTS idx_listing_views_listing ON listing_views(listing_id, created_at);

ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "listing_views_insert" ON listing_views;
CREATE POLICY "listing_views_insert" ON listing_views
  FOR INSERT WITH CHECK (viewer_id = auth.uid());
DROP POLICY IF EXISTS "listing_views_select" ON listing_views;
CREATE POLICY "listing_views_select" ON listing_views
  FOR SELECT USING (
    viewer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM listings l WHERE l.id = listing_id AND l.owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION increment_listing_views(target_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE listings SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = target_id;
$$;
