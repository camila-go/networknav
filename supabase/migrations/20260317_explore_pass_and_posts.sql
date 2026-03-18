-- Pass-button gamification counter
ALTER TABLE user_gamification_stats
  ADD COLUMN IF NOT EXISTS explore_passes INTEGER NOT NULL DEFAULT 0;

-- Explore feed posts (community posts on Explore > Feed tab)
CREATE TABLE IF NOT EXISTS explore_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_explore_posts_created_at ON explore_posts (created_at DESC);

ALTER TABLE explore_posts ENABLE ROW LEVEL SECURITY;
