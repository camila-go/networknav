// ============================================
// Supabase Database Types
// Auto-generated types for database tables
// ============================================

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: MatchInsert;
        Update: MatchUpdate;
        Relationships: [];
      };
      meeting_integrations: {
        Row: MeetingIntegrationRow;
        Insert: MeetingIntegrationInsert;
        Update: MeetingIntegrationUpdate;
        Relationships: [];
      };
      scheduled_meetings: {
        Row: ScheduledMeetingRow;
        Insert: ScheduledMeetingInsert;
        Update: ScheduledMeetingUpdate;
        Relationships: [];
      };
      meeting_requests: {
        Row: MeetingRequestRow;
        Insert: MeetingRequestInsert;
        Update: MeetingRequestUpdate;
        Relationships: [];
      };
      connections: {
        Row: ConnectionRow;
        Insert: ConnectionInsert;
        Update: ConnectionUpdate;
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: MessageInsert;
        Update: MessageUpdate;
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: ReportInsert;
        Update: ReportUpdate;
        Relationships: [];
      };
      user_gamification_stats: {
        Row: UserGamificationStatsRow;
        Insert: UserGamificationStatsInsert;
        Update: UserGamificationStatsUpdate;
        Relationships: [];
      };
      user_activity: {
        Row: UserActivityRow;
        Insert: UserActivityInsert;
        Update: Record<string, never>;
        Relationships: [];
      };
      user_badges: {
        Row: UserBadgeRow;
        Insert: UserBadgeInsert;
        Update: UserBadgeUpdate;
        Relationships: [];
      };
      user_streaks: {
        Row: UserStreakRow;
        Insert: UserStreakInsert;
        Update: UserStreakUpdate;
        Relationships: [];
      };
      user_photos: {
        Row: UserPhotoRow;
        Insert: UserPhotoInsert;
        Update: UserPhotoUpdate;
        Relationships: [];
      };
      moderation_queue: {
        Row: ModerationQueueRow;
        Insert: ModerationQueueInsert;
        Update: ModerationQueueUpdate;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
        Relationships: [];
      };
      notification_preferences: {
        Row: NotificationPreferencesRow;
        Insert: NotificationPreferencesInsert;
        Update: NotificationPreferencesUpdate;
        Relationships: [];
      };
      network_pulse_votes: {
        Row: NetworkPulseVoteRow;
        Insert: NetworkPulseVoteInsert;
        Update: NetworkPulseVoteUpdate;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      match_profiles: {
        Args: {
          query_embedding: number[];
          match_threshold: number;
          match_count: number;
          excluded_user_id: string;
        };
        Returns: MatchProfileResult[];
      };
      block_user: {
        Args: {
          blocker_id: string;
          blocked_id: string;
        };
        Returns: void;
      };
      unblock_user: {
        Args: {
          blocker_id: string;
          blocked_id: string;
        };
        Returns: void;
      };
      increment_gamification_stats: {
        Args: {
          p_user_id: string;
          p_points: number;
          p_stat_field: string;
          p_last_active: string;
        };
        Returns: void;
      };
    };
  };
};

// ============================================
// User Profiles Table
// ============================================

export type UserProfileRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string;
  bio: string | null;
  interests: string[] | null;
  location: string | null;
  age: number | null;
  profile_embedding: number[] | null;
  is_active: boolean;
  is_visible: boolean;
  email_verified: boolean;
  blocked_users: string[];
  created_at: string;
  updated_at: string;

  role: string;

  // Extended fields for Jynx leadership profiles
  title?: string;
  company?: string;
  photo_url?: string;
  questionnaire_completed?: boolean;
  questionnaire_data?: Record<string, unknown>;
};

export type UserProfileInsert = {
  role?: string;
  id?: string;
  user_id?: string | null;
  email?: string | null;
  name: string;
  bio?: string | null;
  interests?: string[] | null;
  location?: string | null;
  age?: number | null;
  profile_embedding?: number[] | null;
  is_active?: boolean;
  is_visible?: boolean;
  email_verified?: boolean;
  blocked_users?: string[];
  created_at?: string;
  updated_at?: string;
  title?: string;
  company?: string;
  photo_url?: string;
  questionnaire_completed?: boolean;
  questionnaire_data?: Record<string, unknown>;
};

export type UserProfileUpdate = {
  role?: string;
  id?: string;
  user_id?: string | null;
  email?: string | null;
  name?: string;
  bio?: string | null;
  interests?: string[] | null;
  location?: string | null;
  age?: number | null;
  profile_embedding?: number[] | null;
  is_active?: boolean;
  is_visible?: boolean;
  email_verified?: boolean;
  blocked_users?: string[];
  updated_at?: string;
  title?: string;
  company?: string;
  photo_url?: string;
  questionnaire_completed?: boolean;
  questionnaire_data?: Record<string, unknown>;
};

// ============================================
// Matches Table
// ============================================

export type MatchRow = {
  id: string;
  user_id: string;
  matched_user_id: string;
  similarity_score: number;
  created_at: string;
};

export type MatchInsert = {
  id?: string;
  user_id: string;
  matched_user_id: string;
  similarity_score: number;
  created_at?: string;
};

export type MatchUpdate = {
  id?: string;
  user_id?: string;
  matched_user_id?: string;
  similarity_score?: number;
};

// ============================================
// Meeting Integrations Table
// ============================================

export type MeetingPlatform = 'google' | 'microsoft';

export type MeetingIntegrationRow = {
  id: string;
  user_id: string;
  platform: MeetingPlatform;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingIntegrationInsert = {
  id?: string;
  user_id: string;
  platform: MeetingPlatform;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MeetingIntegrationUpdate = {
  access_token?: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  updated_at?: string;
};

// ============================================
// Scheduled Meetings Table
// ============================================

export type ScheduledMeetingPlatform = 'google_meet' | 'teams';
export type ScheduledMeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export type ScheduledMeetingRow = {
  id: string;
  host_user_id: string;
  guest_user_id: string;
  platform: ScheduledMeetingPlatform;
  meeting_link: string;
  meeting_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  status: ScheduledMeetingStatus;
  created_at: string;
};

export type ScheduledMeetingInsert = {
  id?: string;
  host_user_id: string;
  guest_user_id: string;
  platform: ScheduledMeetingPlatform;
  meeting_link: string;
  meeting_id?: string | null;
  title: string;
  start_time: string;
  end_time: string;
  status?: ScheduledMeetingStatus;
  created_at?: string;
};

export type ScheduledMeetingUpdate = {
  meeting_link?: string;
  meeting_id?: string | null;
  title?: string;
  start_time?: string;
  end_time?: string;
  status?: ScheduledMeetingStatus;
};

// ============================================
// Reports Table
// ============================================

export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
};

export type ReportInsert = {
  id?: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description?: string | null;
  status?: ReportStatus;
  created_at?: string;
};

export type ReportUpdate = {
  reason?: string;
  description?: string | null;
  status?: ReportStatus;
};

// ============================================
// Meeting Requests Table
// ============================================

export type MeetingRequestStatus = 'pending' | 'scheduled' | 'declined' | 'cancelled' | 'completed';
export type MeetingType = 'video' | 'coffee' | 'conference' | 'phone';

export type MeetingRequestRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: MeetingRequestStatus;
  meeting_type: MeetingType;
  duration: number;
  context_message: string | null;
  proposed_times: string[];
  accepted_time: string | null;
  meeting_link: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingRequestInsert = {
  id?: string;
  requester_id: string;
  recipient_id: string;
  status?: MeetingRequestStatus;
  meeting_type: MeetingType;
  duration: number;
  context_message?: string | null;
  proposed_times: string[];
  accepted_time?: string | null;
  meeting_link?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type MeetingRequestUpdate = {
  status?: MeetingRequestStatus;
  accepted_time?: string | null;
  meeting_link?: string | null;
  updated_at?: string;
};

// ============================================
// Connections Table
// ============================================

export type ConnectionStatus = 'pending' | 'accepted' | 'declined';

export type ConnectionRow = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

export type ConnectionInsert = {
  id?: string;
  requester_id: string;
  recipient_id: string;
  status?: ConnectionStatus;
  message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ConnectionUpdate = {
  status?: ConnectionStatus;
  updated_at?: string;
};

// ============================================
// Messages Table
// ============================================

export type MessageRow = {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type MessageInsert = {
  id?: string;
  connection_id: string;
  sender_id: string;
  content: string;
  read?: boolean;
  created_at?: string;
};

export type MessageUpdate = {
  read?: boolean;
};

// ============================================
// Gamification Tables
// ============================================

export type UserGamificationStatsRow = {
  id: string;
  user_id: string;
  total_points: number;
  points_this_week: number;
  points_this_month: number;
  messages_sent: number;
  meetings_scheduled: number;
  connections_made: number;
  intros_requested: number;
  explore_passes: number;
  current_daily_streak: number;
  current_weekly_streak: number;
  longest_daily_streak: number;
  longest_weekly_streak: number;
  last_active_at: string | null;
  weekly_goal: number | null;
  created_at: string;
  updated_at: string;
};

export type UserGamificationStatsInsert = {
  id?: string;
  user_id: string;
  total_points?: number;
  points_this_week?: number;
  points_this_month?: number;
  messages_sent?: number;
  meetings_scheduled?: number;
  connections_made?: number;
  intros_requested?: number;
  explore_passes?: number;
  current_daily_streak?: number;
  current_weekly_streak?: number;
  longest_daily_streak?: number;
  longest_weekly_streak?: number;
  last_active_at?: string | null;
  weekly_goal?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type UserGamificationStatsUpdate = {
  total_points?: number;
  points_this_week?: number;
  points_this_month?: number;
  messages_sent?: number;
  meetings_scheduled?: number;
  connections_made?: number;
  intros_requested?: number;
  explore_passes?: number;
  current_daily_streak?: number;
  current_weekly_streak?: number;
  longest_daily_streak?: number;
  longest_weekly_streak?: number;
  last_active_at?: string | null;
  weekly_goal?: number | null;
  updated_at?: string;
  [key: string]: unknown;
};

export type UserActivityRow = {
  id: string;
  user_id: string;
  activity_type: string;
  points_earned: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type UserActivityInsert = {
  id?: string;
  user_id: string;
  activity_type: string;
  points_earned: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type UserBadgeRow = {
  id: string;
  user_id: string;
  badge_type: string;
  tier: string;
  progress: number;
  earned_at: string;
  updated_at: string;
};

export type UserBadgeInsert = {
  id?: string;
  user_id: string;
  badge_type: string;
  tier: string;
  progress?: number;
  earned_at?: string;
  updated_at?: string;
};

export type UserBadgeUpdate = {
  tier?: string;
  progress?: number;
  updated_at?: string;
};

export type UserStreakRow = {
  id: string;
  user_id: string;
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  week_start_date: string | null;
  points_this_week: number;
  streak_frozen_until: string | null;
  freezes_used_this_week: number;
  created_at: string;
  updated_at: string;
};

export type UserStreakInsert = {
  id?: string;
  user_id: string;
  streak_type: string;
  current_streak?: number;
  longest_streak?: number;
  last_activity_date?: string | null;
  week_start_date?: string | null;
  points_this_week?: number;
  streak_frozen_until?: string | null;
  freezes_used_this_week?: number;
  created_at?: string;
  updated_at?: string;
};

export type UserStreakUpdate = {
  current_streak?: number;
  longest_streak?: number;
  last_activity_date?: string | null;
  week_start_date?: string | null;
  points_this_week?: number;
  streak_frozen_until?: string | null;
  freezes_used_this_week?: number;
  updated_at?: string;
};

// ============================================
// User Photos Table
// ============================================

export type UserPhotoRow = {
  id: string;
  user_id: string;
  storage_key: string;
  url: string;
  caption: string | null;
  activity_tag: string | null;
  display_order: number;
  created_at: string;
};

export type UserPhotoInsert = {
  id?: string;
  user_id: string;
  storage_key: string;
  url: string;
  caption?: string | null;
  activity_tag?: string | null;
  display_order?: number;
  created_at?: string;
};

export type UserPhotoUpdate = {
  caption?: string | null;
  activity_tag?: string | null;
  display_order?: number;
};

// ============================================
// Moderation Queue Table
// ============================================

export type ModerationContentType = 'post' | 'reply' | 'message' | 'profile' | 'photo';
export type ModerationReason = 'auto_flagged' | 'user_report' | 'manual_review';
export type ModerationQueueStatus = 'pending' | 'approved' | 'rejected' | 'deleted';

export type ModerationQueueRow = {
  id: string;
  content_type: ModerationContentType;
  content_id: string;
  user_id: string;
  content_snapshot: string | null;
  image_url: string | null;
  reason: ModerationReason;
  report_id: string | null;
  status: ModerationQueueStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
};

export type ModerationQueueInsert = {
  id?: string;
  content_type: ModerationContentType;
  content_id: string;
  user_id: string;
  content_snapshot?: string | null;
  image_url?: string | null;
  reason: ModerationReason;
  report_id?: string | null;
  status?: ModerationQueueStatus;
  created_at?: string;
};

export type ModerationQueueUpdate = {
  status?: ModerationQueueStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  reviewer_notes?: string | null;
};

// ============================================
// Notifications Table
// ============================================

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
};

export type NotificationInsert = {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  read?: boolean;
  created_at?: string;
};

export type NotificationUpdate = {
  read?: boolean;
};

// ============================================
// Notification Preferences Table
// ============================================

export type NotificationPreferencesRow = {
  user_id: string;
  email: boolean;
  in_app: boolean;
  push: boolean;
};

export type NotificationPreferencesInsert = {
  user_id: string;
  email?: boolean;
  in_app?: boolean;
  push?: boolean;
};

export type NotificationPreferencesUpdate = {
  email?: boolean;
  in_app?: boolean;
  push?: boolean;
};

// ============================================
// Network Pulse votes
// ============================================

export type NetworkPulseVoteRow = {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  created_at: string;
  updated_at: string;
};

export type NetworkPulseVoteInsert = {
  id?: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  created_at?: string;
  updated_at?: string;
};

export type NetworkPulseVoteUpdate = {
  option_id?: string;
  updated_at?: string;
};

// ============================================
// Function Return Types
// ============================================

export type MatchProfileResult = {
  id: string;
  name: string;
  bio: string | null;
  interests: string[] | null;
  location: string | null;
  age: number | null;
  similarity: number;
};
