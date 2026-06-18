-- Migration 18: conversations liées à un bail (messagerie par contrat)

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS lease_id UUID REFERENCES leases(id);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'match' CHECK (conversation_type IN ('match', 'bail'));

CREATE INDEX IF NOT EXISTS idx_conversations_lease_id ON conversations(lease_id);

-- Crée automatiquement une conversation de type 'bail' entre le bailleur et le locataire
-- principal dès qu'un nouveau bail est inséré.
CREATE OR REPLACE FUNCTION create_bail_conversation() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND NEW.tenant_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM conversations WHERE lease_id = NEW.id) THEN
      INSERT INTO conversations (user1_id, user2_id, lease_id, conversation_type)
      VALUES (NEW.owner_id, NEW.tenant_id, NEW.id, 'bail');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_bail_conversation ON leases;
CREATE TRIGGER trg_create_bail_conversation
  AFTER INSERT ON leases
  FOR EACH ROW EXECUTE FUNCTION create_bail_conversation();
