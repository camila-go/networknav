-- Migration: Add gamification tables (user_activity, user_streaks, user_badges)
-- Run this in the Supabase Dashboard > SQL Editor > New Query
-- Safe to re-run: uses IF NOT EXISTS throughout

-- ============================================================
-- user_activity
-- ============================================================
-- Tracks all point-earning actions for the gamification system.
-- activity_type: message_sent, meeting_scheduled, connection_made, intro_requested
-- metadata: JSONB for storing contextual info (recipient_id, meeting_id, etc.)

CREATE TABLE IF NOT EXISTS user_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  activity_type   TEXT NOT NULL
                    CHECK (activity_type IN ('message_sent', 'meeting_scheduled', 'connection_made', 'intro_requested')),
  points_earned   INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity(user_id, created_at);

-- ============================================================
-- user_streaks
-- ============================================================
-- Tracks daily and weekly engagement streaks.
-- streak_type: daily (any activity per day), weekly (50+ points per week)
-- streak_frozen_until: allows 1 grace day per week to preserve streak

CREATE TABLE IF NOT EXISTS user_streaks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  streak_type         TEXT NOT NULL
                        CHECK (streak_type IN ('daily', 'weekly')),
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

CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_type ON user_streaks(streak_type);

-- ============================================================
-- user_badges
-- ============================================================
-- Tracks earned badges with tier progression (bronze, silver, gold).
-- badge_type: conversation_starter, super_connector, meeting_master, 
--             networking_streak, weekly_warrior

CREATE TABLE IF NOT EXISTS user_badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_type      TEXT NOT NULL
                    CHECK (badge_type IN (
                      'conversation_starter',
                      'super_connector', 
                      'meeting_master',
                      'networking_streak',
                      'weekly_warrior'
                    )),
  tier            TEXT NOT NULL DEFAULT 'bronze'
                    CHECK (tier IN ('bronze', 'silver', 'gold')),
  progress        INTEGER NOT NULL DEFAULT 0,
  earned_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_type, tier)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_type ON user_badges(badge_type);
CREATE INDEX IF NOT EXISTS idx_user_badges_tier ON user_badges(tier);

-- ============================================================
-- user_gamification_stats (aggregated view for quick lookups)
-- ============================================================
-- Stores aggregated stats to avoid expensive calculations on each request

CREATE TABLE IF NOT EXISTS user_gamification_stats (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  total_points          INTEGER NOT NULL DEFAULT 0,
  points_this_week      INTEGER NOT NULL DEFAULT 0,
  points_this_month     INTEGER NOT NULL DEFAULT 0,
  messages_sent         INTEGER NOT NULL DEFAULT 0,
  meetings_scheduled    INTEGER NOT NULL DEFAULT 0,
  connections_made      INTEGER NOT NULL DEFAULT 0,
  intros_requested      INTEGER NOT NULL DEFAULT 0,
  current_daily_streak  INTEGER NOT NULL DEFAULT 0,
  current_weekly_streak INTEGER NOT NULL DEFAULT 0,
  longest_daily_streak  INTEGER NOT NULL DEFAULT 0,
  longest_weekly_streak INTEGER NOT NULL DEFAULT 0,
  last_active_at        TIMESTAMP WITH TIME ZONE,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_gamification_stats_user_id ON user_gamification_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_stats_last_active ON user_gamification_stats(last_active_at);

-- ============================================================
-- Row Level Security
-- ============================================================
-- The app uses the service-role key (supabaseAdmin) for all queries,
-- which bypasses RLS. Enabling RLS without policies blocks direct
-- anon/authenticated access while leaving the service role unaffected.

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Function to update timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION update_gamification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS user_streaks_updated_at ON user_streaks;
CREATE TRIGGER user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS user_badges_updated_at ON user_badges;
CREATE TRIGGER user_badges_updated_at
  BEFORE UPDATE ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS user_gamification_stats_updated_at ON user_gamification_stats;
CREATE TRIGGER user_gamification_stats_updated_at
  BEFORE UPDATE ON user_gamification_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();
