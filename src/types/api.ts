// ============================================
// API Request/Response Types
// ============================================

import type { UserProfileRow, MatchProfileResult, ScheduledMeetingRow } from './database';

// ============================================
// Profile API Types
// ============================================

export interface ProfileUpdateRequest {
  name: string;
  bio?: string | null;
  interests?: string[] | null;
  location?: string | null;
  age?: number;
  position?: string;
  title?: string;
  company?: string;
  photoUrl?: string;
}

export interface ProfileUpdateResponse {
  success: boolean;
  profile?: {
    id: string;
    name: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    age?: number | null;
    position?: string;
    title?: string;
    company?: string;
  };
  error?: string;
  details?: Record<string, string[]>;
}

// ============================================
// Matching API Types
// ============================================

export interface GetMatchesResponse {
  matches: MatchWithProfile[];
  count: number;
}

export interface MatchWithProfile {
  similarity_score: number;
  created_at: string;
  matched_user: {
    id: string;
    name: string;
    bio?: string | null;
    interests?: string[] | null;
    location?: string | null;
    age?: number | null;
    position?: string;
    title?: string;
    company?: string;
    photo_url?: string;
  };
}

export interface ComputeMatchesRequest {
  userId?: string;
  forAllUsers?: boolean;
}

export interface ComputeMatchesResponse {
  success: boolean;
  userId?: string;
  matchCount?: number;
  processed?: number;
  failed?: number;
  total?: number;
  error?: string;
}

// ============================================
// Meeting API Types
// ============================================

export interface ScheduleMeetingRequest {
  matchedUserId: string;
  platform: 'google' | 'microsoft';
  title: string;
  startTime: string; // ISO date string
  durationMinutes?: number;
}

export interface ScheduleMeetingResponse {
  success: boolean;
  meeting?: {
    id: string;
    meetingLink: string;
    startTime: string;
    endTime: string;
  };
  error?: string;
}

export interface ListMeetingsResponse {
  meetings: ScheduledMeetingRow[];
  count: number;
}

// ============================================
// User Safety API Types
// ============================================

export interface BlockUserRequest {
  blockedUserId: string;
}

export interface BlockUserResponse {
  success: boolean;
  error?: string;
}

export interface ReportUserRequest {
  reportedUserId: string;
  reason: string;
  description?: string;
}

export interface ReportUserResponse {
  success: boolean;
  reportId?: string;
  error?: string;
}

// ============================================
// Integration API Types
// ============================================

export interface IntegrationConnectResponse {
  authUrl: string;
}

export interface IntegrationCallbackResponse {
  success: boolean;
  error?: string;
}

export interface IntegrationStatusResponse {
  google: {
    connected: boolean;
    expiresAt?: string;
  };
  microsoft: {
    connected: boolean;
    expiresAt?: string;
  };
}

// ============================================
// Error Response Type
// ============================================

export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>;
  categories?: string[]; // For content moderation
}

// ============================================
// Rate Limit Types
// ============================================

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime?: number;
}

