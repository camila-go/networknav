-- Activity chip for hobby / outside-work photos (links to gallery wall stats)
ALTER TABLE user_photos
  ADD COLUMN IF NOT EXISTS activity_tag TEXT;

CREATE INDEX IF NOT EXISTS idx_user_photos_activity_tag
  ON user_photos (activity_tag)
  WHERE activity_tag IS NOT NULL;
