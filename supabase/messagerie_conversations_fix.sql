-- ============================================================
-- ISALY · Fix messagerie — alignement colonnes conversations
-- Corrige les erreurs 400 sur /app/messages (colonnes attendues
-- par le code de la refonte mais absentes du schéma de base).
-- Idempotent — à exécuter dans le SQL editor Supabase.
-- ============================================================

-- 1. Colonnes conversations attendues par le code
--    (messages/page.tsx, api/messages, usePresence, ...)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user1_id UUID REFERENCES profiles(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user2_id UUID REFERENCES profiles(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES leases(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'match';

-- 2. Rétro-remplissage user1_id / user2_id depuis le match lié
--    (pour les conversations créées avant l'ajout des colonnes)
UPDATE conversations c
SET user1_id = m.user1_id,
    user2_id = m.user2_id
FROM matches m
WHERE c.match_id = m.id
  AND (c.user1_id IS NULL OR c.user2_id IS NULL);

-- 3. Index pour les filtres .or(user1_id.eq / user2_id.eq)
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON conversations(user2_id);

-- 4. RLS : lecture/écriture par les 2 participants (en plus du match)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participants" ON conversations;
CREATE POLICY "conversations_select_participants" ON conversations FOR SELECT USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
  OR EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "conversations_insert_participants" ON conversations;
CREATE POLICY "conversations_insert_participants" ON conversations FOR INSERT WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

DROP POLICY IF EXISTS "conversations_update_participants" ON conversations;
CREATE POLICY "conversations_update_participants" ON conversations FOR UPDATE USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- 5. Rappels (déjà dans messagerie_upgrade.sql — garantis ici)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
