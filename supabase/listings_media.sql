-- ─────────────────────────────────────────────────────────────
-- listings_media.sql — Bucket photos annonces + policy DELETE manquante
-- À exécuter une fois dans Supabase SQL editor (idempotent).
-- ─────────────────────────────────────────────────────────────

-- ── 1. Bucket public 'listings' pour les photos ──────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('listings', 'listings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture publique (les annonces sont visibles par tous).
DROP POLICY IF EXISTS "listings_public_read" ON storage.objects;
CREATE POLICY "listings_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'listings');

-- Upload par tout utilisateur authentifié (owner auto-fill par Storage).
DROP POLICY IF EXISTS "listings_auth_insert" ON storage.objects;
CREATE POLICY "listings_auth_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listings' AND auth.uid() IS NOT NULL);

-- Update/delete réservés au propriétaire de l'objet (colonne owner de storage.objects).
DROP POLICY IF EXISTS "listings_owner_update" ON storage.objects;
CREATE POLICY "listings_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'listings' AND owner = auth.uid());

DROP POLICY IF EXISTS "listings_owner_delete" ON storage.objects;
CREATE POLICY "listings_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'listings' AND owner = auth.uid());

-- ── 2. Policy DELETE manquante sur la table listings ─────────
-- Sans elle, RLS bloque toute suppression → le bouton "Supprimer"
-- côté /app/mes-annonces échouait silencieusement.
DROP POLICY IF EXISTS "listings_delete" ON listings;
CREATE POLICY "listings_delete" ON listings FOR DELETE
  USING (auth.uid() = owner_id);
