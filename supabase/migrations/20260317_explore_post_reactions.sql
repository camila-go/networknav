CREATE TABLE IF NOT EXISTS explore_post_reactions (
  post_id UUID NOT NULL REFERENCES explore_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT explore_post_reactions_reaction_check CHECK (
    reaction IN ('heart', 'thumbs', 'fire', 'clap', 'laugh')
  )
);

CREATE INDEX IF NOT EXISTS idx_explore_post_reactions_post_id ON explore_post_reactions (post_id);

ALTER TABLE explore_post_reactions ENABLE ROW LEVEL SECURITY;
