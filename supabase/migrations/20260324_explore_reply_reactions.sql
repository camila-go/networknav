-- Per-reply reactions (same emoji keys as explore_post_reactions)
CREATE TABLE IF NOT EXISTS explore_reply_reactions (
  reply_id UUID NOT NULL REFERENCES explore_post_replies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (reply_id, user_id),
  CONSTRAINT explore_reply_reactions_reaction_check CHECK (
    reaction IN ('heart', 'thumbs', 'fire', 'clap', 'laugh')
  )
);

CREATE INDEX IF NOT EXISTS idx_explore_reply_reactions_reply_id
  ON explore_reply_reactions (reply_id);

ALTER TABLE explore_reply_reactions ENABLE ROW LEVEL SECURITY;
