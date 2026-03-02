-- Migration: Add messages table for persistent chat storage
-- Run this in the Supabase Dashboard > SQL Editor > New Query
-- Safe to re-run: uses IF NOT EXISTS

-- ============================================================
-- messages
-- ============================================================
-- Stores chat messages between connected users.
-- connection_id references the connections table.
-- Messages are ordered by created_at for conversation display.

CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL,
  content         TEXT NOT NULL,
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_messages_connection ON messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_connection_created ON messages(connection_id, created_at);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see messages from their own connections
-- (The app uses service role which bypasses RLS, but this protects direct access)
CREATE POLICY IF NOT EXISTS "Users can view their own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM connections c
      WHERE c.id = messages.connection_id
        AND (c.requester_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert messages to their connections"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM connections c
      WHERE c.id = connection_id
        AND c.status = 'accepted'
        AND (c.requester_id = auth.uid() OR c.recipient_id = auth.uid())
    )
  );

-- Function to update connection's updated_at when new message is sent
CREATE OR REPLACE FUNCTION update_connection_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE connections
  SET updated_at = NOW()
  WHERE id = NEW.connection_id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update connection timestamp
DROP TRIGGER IF EXISTS on_message_update_connection ON messages;
CREATE TRIGGER on_message_update_connection
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_connection_on_message();
