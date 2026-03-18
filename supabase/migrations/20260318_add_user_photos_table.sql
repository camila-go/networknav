-- User photo gallery table
-- Stores gallery photos uploaded by users (avatars are stored directly on user_profiles.photo_url)
CREATE TABLE IF NOT EXISTS user_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  storage_key     TEXT NOT NULL,
  url             TEXT NOT NULL,
  caption         TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON user_photos(user_id);

-- Enable RLS
ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- The app uses supabaseAdmin (service role) for all queries, which bypasses RLS.
-- These policies are for defense-in-depth if the anon key is ever used directly.
CREATE POLICY "Anyone can view photos"
  ON user_photos FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can insert own photos"
  ON user_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = user_photos.user_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own photos"
  ON user_photos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = user_photos.user_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own photos"
  ON user_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = user_photos.user_id
      AND user_id = auth.uid()
    )
  );

-- Storage bucket: 'profile-photos' must be created in Supabase Dashboard > Storage > New Bucket
-- Set the bucket to PUBLIC so photo URLs are accessible without auth tokens.
-- Both avatars ({userId}/avatar) and gallery photos ({userId}/gallery/{photoId}) are stored there.
