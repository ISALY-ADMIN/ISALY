-- ═══════════════════════════════════════════════════════════════
-- ISALY — Schéma de base de données Supabase/PostgreSQL
-- ═══════════════════════════════════════════════════════════════

-- Utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('locataire', 'loueur')),
  city TEXT,
  budget_max INTEGER,
  schedule TEXT CHECK (schedule IN ('leve-tot', 'couche-tard', 'variable', 'flexible')),
  vibe TEXT CHECK (vibe IN ('calme', 'festif', 'studieux', 'detendu')),
  passions TEXT[],
  bio TEXT,
  phone TEXT,
  profile_complete INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  matching_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add columns if the table already exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS matching_data JSONB;

-- Annonces
CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id),
  title TEXT,
  description TEXT,
  city TEXT,
  neighborhood TEXT,
  rent INTEGER,
  charges INTEGER,
  surface INTEGER,
  rooms_available INTEGER,
  photos TEXT[],
  boost_type TEXT CHECK (boost_type IN ('standard', 'featured', 'priority')) DEFAULT 'standard',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Swipes
CREATE TABLE IF NOT EXISTS swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID REFERENCES profiles(id),
  swiped_id UUID REFERENCES profiles(id),
  direction TEXT CHECK (direction IN ('left', 'right', 'super')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

-- Matchs
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES profiles(id),
  user2_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dossier
CREATE TABLE IF NOT EXISTS dossiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) UNIQUE,
  identity_doc_url TEXT,
  identity_verified BOOLEAN DEFAULT false,
  income_monthly INTEGER,
  contract_type TEXT,
  payslips_urls TEXT[],
  rent_receipts_urls TEXT[],
  insurance_url TEXT,
  guarantor_name TEXT,
  guarantor_doc_url TEXT,
  completion_percent INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bail
CREATE TABLE IF NOT EXISTS leases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES profiles(id),
  owner_id UUID REFERENCES profiles(id),
  address TEXT,
  city TEXT,
  monthly_rent INTEGER,
  start_date DATE,
  end_date DATE,
  nb_roommates INTEGER DEFAULT 1,
  lease_doc_url TEXT,
  status TEXT CHECK (status IN ('active', 'ended', 'pending')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paiements
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  stripe_payment_intent_id TEXT,
  amount INTEGER,
  plan_type TEXT CHECK (plan_type IN ('assurance', 'featured', 'priority')),
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles: lecture publique, écriture par le propriétaire
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Listings: lecture publique, gestion par le propriétaire
CREATE POLICY "listings_select" ON listings FOR SELECT USING (true);
CREATE POLICY "listings_insert" ON listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "listings_update" ON listings FOR UPDATE USING (auth.uid() = owner_id);

-- Swipes: le swiper gère ses swipes
CREATE POLICY "swipes_insert" ON swipes FOR INSERT WITH CHECK (auth.uid() = swiper_id);
CREATE POLICY "swipes_select" ON swipes FOR SELECT USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

-- Matches: lecture par les participants
CREATE POLICY "matches_select" ON matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);
CREATE POLICY "matches_insert" ON matches FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Conversations: lecture par les participants du match associé
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);

-- Messages: lecture/écriture par les participants de la conversation
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN matches m ON m.id = c.match_id
    WHERE c.id = conversation_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Dossiers: propriétaire uniquement
CREATE POLICY "dossiers_all" ON dossiers USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Leases: lecture par tenant ET owner
CREATE POLICY "leases_select" ON leases FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = owner_id);
CREATE POLICY "leases_insert" ON leases FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "leases_update" ON leases FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = tenant_id);

-- Payments: propriétaire uniquement
CREATE POLICY "payments_all" ON payments USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Créer le profil automatiquement après signup
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- DOSSIER — LIENS DE PARTAGE SÉCURISÉS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS dossier_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dossier_shares ENABLE ROW LEVEL SECURITY;
-- Propriétaire : lecture + écriture
CREATE POLICY "shares_owner" ON dossier_shares USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Lecture publique par token (pour la page /dossier/[token])
CREATE POLICY "shares_public_read" ON dossier_shares FOR SELECT USING (expires_at > NOW());

-- ═══════════════════════════════════════════════════════════════
-- CERTIFICATION UTILISATEUR
-- ═══════════════════════════════════════════════════════════════

-- Certifications (une par niveau par utilisateur)
CREATE TABLE IF NOT EXISTS user_certifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  level INTEGER CHECK (level IN (1, 2, 3)) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, level)
);

-- Documents uploadés pour la certification
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('identity_front', 'identity_back', 'selfie', 'payslip', 'domicile', 'guarantor')) NOT NULL,
  file_url TEXT,
  status TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Avis entre colocataires
CREATE TABLE IF NOT EXISTS user_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reviewed_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT CHECK (char_length(comment) <= 150),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reviewer_id, reviewed_id)
);

-- Statistiques utilisateur (taux de réponse, score fiabilité)
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  response_rate INTEGER DEFAULT 0,
  avg_response_time NUMERIC(6,2) DEFAULT 0,
  reliability_score INTEGER DEFAULT 0,
  member_since TIMESTAMPTZ DEFAULT NOW()
);

-- RLS — certifications
ALTER TABLE user_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cert_select" ON user_certifications FOR SELECT USING (true);
CREATE POLICY "cert_insert" ON user_certifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cert_update_owner" ON user_certifications FOR UPDATE USING (auth.uid() = user_id);

-- RLS — documents (privé — seul le propriétaire + service_role)
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs_all" ON user_documents USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS — avis (lecture publique, écriture par le reviewer)
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_select" ON user_reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON user_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- RLS — stats (lecture publique, écriture par le propriétaire ou service_role)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stats_select" ON user_stats FOR SELECT USING (true);
CREATE POLICY "stats_upsert" ON user_stats FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket pour les documents de certification
-- (à exécuter dans le dashboard Supabase Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certifications', 'certifications', false);

-- ═══════════════════════════════════════════════════════════════
-- REALTIME: Activer pour la messagerie
-- ═══════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
