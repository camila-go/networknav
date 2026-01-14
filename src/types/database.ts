// ============================================
// Supabase Database Types
// Auto-generated types for database tables
// ============================================

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      matches: {
        Row: MatchRow;
        Insert: MatchInsert;
        Update: MatchUpdate;
      };
      meeting_integrations: {
        Row: MeetingIntegrationRow;
        Insert: MeetingIntegrationInsert;
        Update: MeetingIntegrationUpdate;
      };
      scheduled_meetings: {
        Row: ScheduledMeetingRow;
        Insert: ScheduledMeetingInsert;
        Update: ScheduledMeetingUpdate;
      };
      reports: {
        Row: ReportRow;
        Insert: ReportInsert;
        Update: ReportUpdate;
      };
    };
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
    };
  };
}

// ============================================
// User Profiles Table
// ============================================

export interface UserProfileRow {
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
  
  // Extended fields for Jynx leadership profiles
  position?: string;
  title?: string;
  company?: string;
  photo_url?: string;
  questionnaire_completed?: boolean;
  questionnaire_data?: Record<string, unknown>;
}

export interface UserProfileInsert {
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
  position?: string;
  title?: string;
  company?: string;
  photo_url?: string;
  questionnaire_completed?: boolean;
  questionnaire_data?: Record<string, unknown>;
}

export interface UserProfileUpdate {
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
  position?: string;
  title?: string;
  company?: string;
  photo_url?: string;
  questionnaire_completed?: boolean;
  questionnaire_data?: Record<string, unknown>;
}

// ============================================
// Matches Table
// ============================================

export interface MatchRow {
  id: string;
  user_id: string;
  matched_user_id: string;
  similarity_score: number;
  created_at: string;
}

export interface MatchInsert {
  id?: string;
  user_id: string;
  matched_user_id: string;
  similarity_score: number;
  created_at?: string;
}

export interface MatchUpdate {
  id?: string;
  user_id?: string;
  matched_user_id?: string;
  similarity_score?: number;
}

// ============================================
// Meeting Integrations Table
// ============================================

export type MeetingPlatform = 'google' | 'microsoft';

export interface MeetingIntegrationRow {
  id: string;
  user_id: string;
  platform: MeetingPlatform;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingIntegrationInsert {
  id?: string;
  user_id: string;
  platform: MeetingPlatform;
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MeetingIntegrationUpdate {
  access_token?: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  updated_at?: string;
}

// ============================================
// Scheduled Meetings Table
// ============================================

export type ScheduledMeetingPlatform = 'google_meet' | 'teams';
export type ScheduledMeetingStatus = 'scheduled' | 'completed' | 'cancelled';

export interface ScheduledMeetingRow {
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
}

export interface ScheduledMeetingInsert {
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
}

export interface ScheduledMeetingUpdate {
  meeting_link?: string;
  meeting_id?: string | null;
  title?: string;
  start_time?: string;
  end_time?: string;
  status?: ScheduledMeetingStatus;
}

// ============================================
// Reports Table
// ============================================

export type ReportStatus = 'pending' | 'reviewed' | 'resolved';

export interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
}

export interface ReportInsert {
  id?: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description?: string | null;
  status?: ReportStatus;
  created_at?: string;
}

export interface ReportUpdate {
  reason?: string;
  description?: string | null;
  status?: ReportStatus;
}

// ============================================
// Function Return Types
// ============================================

export interface MatchProfileResult {
  id: string;
  name: string;
  bio: string | null;
  interests: string[] | null;
  location: string | null;
  age: number | null;
  similarity: number;
}

