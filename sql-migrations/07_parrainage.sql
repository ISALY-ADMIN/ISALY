-- Migration 07 : système de parrainage
-- À exécuter dans Supabase Dashboard > SQL Editor

-- Colonnes parrainage dans profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Index pour la recherche par code
CREATE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles(referral_code);

-- Fonction de génération de code unique (6 caractères alphanumériques)
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  code TEXT;
  attempts INTEGER := 0;
  i INTEGER;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * 36 + 1)::INTEGER, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Impossible de générer un code de parrainage unique';
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mise à jour du trigger pour inclure le code parrainage à la création
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, referral_code)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    generate_referral_code()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill : générer des codes pour les utilisateurs existants
DO $$
DECLARE
  r RECORD;
  code TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
    LOOP
      code := '';
      FOR i IN 1..6 LOOP
        code := code || substr(chars, floor(random() * 36 + 1)::INTEGER, 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = code);
    END LOOP;
    UPDATE profiles SET referral_code = code WHERE id = r.id;
  END LOOP;
END;
$$;

-- Politique RLS : autoriser la mise à jour du referral_count par le service_role
-- (le service_role bypass automatiquement RLS — pas de politique supplémentaire nécessaire)
-- Politique pour autoriser la mise à jour de referred_by sur son propre profil
CREATE POLICY IF NOT EXISTS "profiles_update_referred_by" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
