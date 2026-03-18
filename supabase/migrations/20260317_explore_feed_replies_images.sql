-- After this migration: in Supabase Dashboard > Storage, create a public bucket named "explore-feed"
-- (optional; if missing, uploads fall back to inline data URLs).

-- Post images (public URLs or data URLs from upload fallback)
ALTER TABLE explore_posts
  ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Threaded replies
CREATE TABLE IF NOT EXISTS explore_post_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES explore_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_explore_post_replies_post_id ON explore_post_replies (post_id);

ALTER TABLE explore_post_replies ENABLE ROW LEVEL SECURITY;

-- Optional: create Storage bucket "explore-feed" in Dashboard (public) for image uploads
