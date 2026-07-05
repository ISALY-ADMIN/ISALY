-- ============================================================
-- ISALY · Refonte messagerie
-- Types de messages enrichis, réactions emoji, présence
-- À exécuter dans le SQL editor Supabase.
-- ============================================================

-- 1. Messages enrichis (cartes visite / réservation / annonce / document)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS type text DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS payload jsonb;

-- 2. Présence "en ligne" réelle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- 3. Réactions emoji sur les messages (façon iMessage / WhatsApp)
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Lecture : les 2 participants de la conversation du message
DROP POLICY IF EXISTS "message_reactions_select" ON message_reactions;
CREATE POLICY "message_reactions_select" ON message_reactions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- Ajout : uniquement ses propres réactions, sur un message d'une de ses conversations
DROP POLICY IF EXISTS "message_reactions_insert" ON message_reactions;
CREATE POLICY "message_reactions_insert" ON message_reactions FOR INSERT WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE m.id = message_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- Suppression : ses propres réactions
DROP POLICY IF EXISTS "message_reactions_delete" ON message_reactions;
CREATE POLICY "message_reactions_delete" ON message_reactions FOR DELETE USING (
  user_id = auth.uid()
);

-- 4. Realtime : diffuser réactions + updates de messages (statut visite/réservation)
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
-- messages est déjà publié ; on s'assure que les UPDATE remontent (payload complet)
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE message_reactions REPLICA IDENTITY FULL;
