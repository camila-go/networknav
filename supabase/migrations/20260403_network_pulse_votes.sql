-- Network Pulse polls: one row per user per poll (vote can be updated until you lock via app policy).

CREATE TABLE IF NOT EXISTS network_pulse_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  option_id TEXT NOT NULL
    CHECK (char_length(option_id) >= 1 AND char_length(option_id) <= 64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_network_pulse_votes_poll_id ON network_pulse_votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_network_pulse_votes_user_id ON network_pulse_votes (user_id);

COMMENT ON TABLE network_pulse_votes IS 'Aggregated Network Pulse poll votes; app uses service role.';
