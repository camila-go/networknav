-- Fix: Recreate gamification tables without strict foreign key constraints
-- This allows activity tracking even for demo/device-id users

-- Drop and recreate user_activity without FK constraint
DROP TABLE IF EXISTS user_activity CASCADE;
CREATE TABLE user_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT NOT NULL,
  activity_type   TEXT NOT NULL,
  points_earned   INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX idx_user_activity_user_date ON user_activity(user_id, created_at);

-- Drop and recreate user_streaks without FK constraint
DROP TABLE IF EXISTS user_streaks CASCADE;
CREATE TABLE user_streaks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             TEXT NOT NULL,
  streak_type         TEXT NOT NULL,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  longest_streak      INTEGER NOT NULL DEFAULT 0,
  last_activity_date  DATE,
  week_start_date     DATE,
  points_this_week    INTEGER NOT NULL DEFAULT 0,
  streak_frozen_until DATE,
  freezes_used_this_week INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, streak_type)
);

CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_user_streaks_type ON user_streaks(streak_type);

-- Drop and recreate user_gamification_stats without FK constraint  
DROP TABLE IF EXISTS user_gamification_stats CASCADE;
CREATE TABLE user_gamification_stats (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 TEXT NOT NULL UNIQUE,
  total_points            INTEGER NOT NULL DEFAULT 0,
  points_this_week        INTEGER NOT NULL DEFAULT 0,
  points_this_month       INTEGER NOT NULL DEFAULT 0,
  messages_sent           INTEGER NOT NULL DEFAULT 0,
  meetings_scheduled      INTEGER NOT NULL DEFAULT 0,
  connections_made        INTEGER NOT NULL DEFAULT 0,
  intros_requested        INTEGER NOT NULL DEFAULT 0,
  current_daily_streak    INTEGER NOT NULL DEFAULT 0,
  current_weekly_streak   INTEGER NOT NULL DEFAULT 0,
  longest_daily_streak    INTEGER NOT NULL DEFAULT 0,
  longest_weekly_streak   INTEGER NOT NULL DEFAULT 0,
  weekly_goal             INTEGER NOT NULL DEFAULT 25,
  last_active_at          TIMESTAMP WITH TIME ZONE,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_gamification_stats_user_id ON user_gamification_stats(user_id);

-- Keep user_badges as is (it's working)
-- Just ensure RLS is enabled
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification_stats ENABLE ROW LEVEL SECURITY;

-- Verify tables were created
SELECT 'Tables created successfully' as status;
