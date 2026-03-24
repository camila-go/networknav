-- Allow thoughtful_curator in user_badges (matches app types + gamification logic)
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_type_check;
ALTER TABLE user_badges ADD CONSTRAINT user_badges_badge_type_check CHECK (
  badge_type IN (
    'conversation_starter',
    'super_connector',
    'meeting_master',
    'networking_streak',
    'weekly_warrior',
    'thoughtful_curator'
  )
);
