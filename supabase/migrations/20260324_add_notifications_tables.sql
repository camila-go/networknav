-- In-app notifications (badge earned, meetings, etc.)
-- Required for /api/notifications and persist across serverless instances.
-- Without this table, insertNotificationToSupabase fails and the bell stays empty.

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  email   BOOLEAN NOT NULL DEFAULT true,
  in_app  BOOLEAN NOT NULL DEFAULT true,
  push    BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
