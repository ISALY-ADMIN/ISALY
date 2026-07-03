-- Migration 25 : bucket Storage avatars public + politiques RLS
-- Cause du bug "upload photo" (mobile ET web) : le bucket avatars n'existe pas
-- (GET /storage/v1/object/public/avatars/... renvoie "Bucket not found").
-- À exécuter dans Supabase Dashboard > SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique (affichage des photos de profil)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_public_read'
  ) THEN
    CREATE POLICY "avatars_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;
END
$$;

-- Chaque utilisateur écrit uniquement dans son dossier <uid>/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_owner_insert'
  ) THEN
    CREATE POLICY "avatars_owner_insert" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END
$$;

-- Remplacement (upsert) et suppression de sa propre photo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_owner_update'
  ) THEN
    CREATE POLICY "avatars_owner_update" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_owner_delete'
  ) THEN
    CREATE POLICY "avatars_owner_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END
$$;
