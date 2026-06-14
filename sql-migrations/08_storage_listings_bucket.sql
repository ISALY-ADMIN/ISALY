-- Migration 08 : bucket Storage listings public + politiques RLS
-- À exécuter dans Supabase Dashboard > SQL Editor

-- Créer le bucket listings en public (ou le rendre public s'il existe déjà)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique pour tout le monde (affichage annonces)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'listings_photos_public_read'
  ) THEN
    CREATE POLICY "listings_photos_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'listings');
  END IF;
END
$$;

-- Upload autorisé pour les utilisateurs authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'listings_photos_auth_insert'
  ) THEN
    CREATE POLICY "listings_photos_auth_insert" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'listings' AND auth.role() = 'authenticated'
      );
  END IF;
END
$$;

-- Suppression autorisée pour les utilisateurs authentifiés
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'listings_photos_auth_delete'
  ) THEN
    CREATE POLICY "listings_photos_auth_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'listings' AND auth.role() = 'authenticated'
      );
  END IF;
END
$$;
