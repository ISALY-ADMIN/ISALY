-- ============================================================
-- ISALY · Messagerie v2 — contexte annonce + profil public
-- Idempotent — à exécuter dans le SQL editor Supabase.
-- ============================================================

-- 1. Conversation liée à une annonce (bandeau contexte façon Leboncoin)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_listing ON conversations(listing_id);

-- 2. Badge "Actuellement en colocation" sur le profil public.
--    Les RLS leases sont owner/tenant-only : on expose UNIQUEMENT un booléen
--    via une fonction SECURITY DEFINER (aucune adresse/loyer/nom divulgué).
CREATE OR REPLACE FUNCTION public.has_active_lease(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.leases
    WHERE tenant_id = uid AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION public.has_active_lease(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_lease(UUID) TO authenticated;
