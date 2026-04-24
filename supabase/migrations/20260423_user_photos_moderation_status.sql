-- Gallery photo moderation: admin approval required before photos go public.
-- Avatars skip this table entirely (auto-approved, live on users.photo_url).
ALTER TABLE user_photos
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE user_photos
  DROP CONSTRAINT IF EXISTS user_photos_status_check,
  ADD CONSTRAINT user_photos_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));

-- Grandfather existing rows in: they predate moderation, so treat them as approved.
UPDATE user_photos SET status = 'approved' WHERE status = 'pending' AND created_at < NOW();

CREATE INDEX IF NOT EXISTS idx_user_photos_status ON user_photos(status);
