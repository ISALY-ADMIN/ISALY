-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 00 — Trigger profil + tables notifications/push
-- À exécuter dans le Supabase SQL Editor (une seule fois)
-- ═══════════════════════════════════════════════════════════════

-- Trigger : créer automatiquement un profil à chaque nouveau signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table notifications (cloche in-app)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete" ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id, created_at DESC);

-- Activer Realtime pour les notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Table push_subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  subscription JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_owner" ON push_subscriptions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
