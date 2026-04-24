// ============================================
// Core User Types
// ============================================

export type UserRole = "user" | "moderator" | "admin";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  profile: UserProfile;
  questionnaireCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  title: string;
  company?: string;
  photoUrl?: string;
  location?: string;
}

export interface PublicUser {
  id: string;
  email?: string;
  profile: UserProfile;
  questionnaireCompleted: boolean;
}

export type UserPhotoStatus = "pending" | "approved" | "rejected";

export interface UserPhoto {
  id: string;
  userId: string;
  storageKey: string;
  url: string;
  caption?: string;
  /** Normalized label for community gallery grouping (optional). */
  activityTag?: string;
  displayOrder: number;
  /** Moderation state — gallery photos wait in `pending` until an admin approves. */
  status: UserPhotoStatus;
  createdAt: Date;
}

// ============================================
// Questionnaire Types
// ============================================

export interface QuestionnaireResponse {
  userId: string;
  responses: QuestionnaireData;
  completionPercentage: number;
  completedAt?: Date;
  lastUpdated: Date;
}

/** Global Summit 2026 — AI Networking Guide (onboarding questionnaire) */
export interface QuestionnaireData {
  roleSummary?: string;
  archetype?: string;
  teamQualities?: string[];
  growthArea?: string;
  talkTopic?: string;
  /** Conditional follow-up after talkTopic (AI vs leadership keyword) */
  refinedInterest?: string;
  personalInterest?: string;
  /** Set by conversational wizard after optional photo step */
  personalInterestPhoto?: "uploaded" | "skipped";
  personalityTags?: string[];
  joyTrigger?: string;
  threeWords?: string;
  headline?: string;
  funFact?: string;
}

export interface QuestionSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  questions: Question[];
}

export interface Question {
  id: keyof QuestionnaireData;
  text: string;
  conversationalPrompt?: string; // Casual, chat-friendly version of the question
  type: QuestionType;
  options?: QuestionOption[];
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  skipLogic?: SkipLogicRule[];
  customFieldId?: keyof QuestionnaireData; // For multi-select-custom: ID of field to store custom values
  customFieldPlaceholder?: string; // Placeholder text for custom input
  /** Free-text questions */
  textPlaceholder?: string;
  textMultiline?: boolean;
}

export type QuestionType =
  | "single-select"
  | "multi-select"
  | "multi-select-custom" // Multi-select with ability to add custom typed values
  | "slider"
  | "rank"
  | "icon-select"
  | "text";

export interface QuestionOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface SkipLogicRule {
  dependsOn: keyof QuestionnaireData;
  showWhen: string | string[];
}

// ============================================
// Match Types
// ============================================

export type MatchType = "high-affinity" | "strategic";

export type CommonalityCategory =
  | "professional"
  | "hobby"
  | "lifestyle"
  | "values";

export interface Commonality {
  category: CommonalityCategory;
  description: string;
  weight: number;
}

export interface Match {
  id: string;
  userId: string;
  matchedUserId: string;
  matchedUser: PublicUser;
  type: MatchType;
  commonalities: Commonality[];
  conversationStarters: string[];
  score: number;
  generatedAt: Date;
  viewed: boolean;
  passed: boolean;
}

export interface MatchWithUser extends Match {
  matchedUser: PublicUser;
}

// ============================================
// Connection Types
// ============================================

export type ConnectionStatus = "pending" | "accepted" | "declined";

export interface Connection {
  id: string;
  requesterId: string;
  recipientId: string;
  status: ConnectionStatus;
  message?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface ConnectionWithUsers extends Connection {
  requester: PublicUser;
  recipient: PublicUser;
}

// ============================================
// Message Types
// ============================================

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

export interface Conversation {
  connection: ConnectionWithUsers;
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType =
  | "new_matches"
  | "connection_request"
  | "connection_accepted"
  | "meeting_request"
  | "meeting_accepted"
  | "meeting_declined"
  | "new_message"
  | "request_reminder"
  | "questionnaire_reminder"
  | "badge_earned"
  | "profile_frame_unlocked"
  | "content_removed"
  | "content_warning";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
}

// ============================================
// Meeting Types (replacing in-app messaging)
// ============================================

export type MeetingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type MeetingType = "video" | "coffee" | "conference" | "phone";

export type CalendarPlatform = "teams" | "google";

// ============================================
// Calendar Read Types
// ============================================

export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  status: CalendarEventStatus;
  source: CalendarPlatform;
}

export interface FreeBusySlot {
  startTime: Date;
  endTime: Date;
  status: "busy" | "tentative";
}

export interface Meeting {
  id: string;
  requesterId: string;
  recipientId: string;
  status: MeetingStatus;
  duration: number; // minutes
  meetingType: MeetingType;
  contextMessage?: string;
  proposedTimes: Date[];
  acceptedTime?: Date;
  calendarPlatform?: CalendarPlatform;
  meetingLink?: string;
  calendarEventId?: string;
  remindersSent: {
    day_before: boolean;
    hour_before: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingWithUsers extends Meeting {
  requester: PublicUser;
  recipient: PublicUser;
  isSentByMe?: boolean;
}

// ============================================
// Search & Filter Types
// ============================================

export interface SearchFilters {
  archetypes?: string[];
  teamQualities?: string[];
  personalityTags?: string[];
  interests?: string[];
  location?: string;
  keywords?: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: SearchFilters;
  notificationsEnabled: boolean;
  lastChecked: Date;
  createdAt: Date;
}

export interface AttendeeSearchResult {
  user: PublicUser;
  matchPercentage: number;
  /** High-affinity vs strategic — assigned by determineMatchType(), not derived from matchPercentage. */
  matchType: MatchType;
  topCommonalities: Commonality[];
  questionnaire?: Partial<QuestionnaireData>;
  /** Human-readable interests that matched the search keywords (explore search) */
  searchMatchLabels?: string[];
  /** AI-generated starters, populated client-side after initial render via /api/matches/[id]/starters */
  conversationStarters?: string[];
}

// ============================================
// Network Graph Types
// ============================================

export interface NetworkNode {
  id: string;
  name: string;
  title: string;
  company?: string;
  /** For Teams meeting deep link */
  email?: string | null;
  photoUrl?: string;
  matchType: MatchType | "neutral" | "discoverable";
  commonalityCount: number;
  commonalities: string[];
  /** Real user id for synthesized "discoverable" bubbles whose node id is synthetic */
  realUserId?: string;
}

export interface NetworkEdge {
  source: string;
  target: string;
  strength: number;
  commonalities: string[];
}

export interface NetworkCluster {
  id: string;
  name: string;
  nodeIds: string[];
  theme: string;
}

export interface NetworkGraphData {
  userId: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters: NetworkCluster[];
  generatedAt: Date;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Auth Types
// ============================================

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  title: string;
  company?: string;
}

// ============================================
// Gamification Types
// ============================================

export type ActivityType =
  | "message_sent"
  | "meeting_scheduled"
  | "connection_made"
  | "intro_requested"
  | "explore_pass";

export type BadgeType =
  | "conversation_starter"
  | "super_connector"
  | "meeting_master"
  | "networking_streak"
  | "weekly_warrior"
  | "thoughtful_curator";

export type BadgeTier = "bronze" | "silver" | "gold";

export type StreakType = "daily" | "weekly";

export interface UserActivity {
  id: string;
  userId: string;
  activityType: ActivityType;
  pointsEarned: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface UserStreak {
  id: string;
  userId: string;
  streakType: StreakType;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  weekStartDate?: string | null;
  pointsThisWeek: number;
  streakFrozenUntil?: string | null;
  freezesUsedThisWeek: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeType: BadgeType;
  tier: BadgeTier;
  progress: number;
  earnedAt: Date;
  updatedAt: Date;
}

export interface GamificationStats {
  id: string;
  userId: string;
  totalPoints: number;
  pointsThisWeek: number;
  pointsThisMonth: number;
  messagesSent: number;
  meetingsScheduled: number;
  connectionsMade: number;
  introsRequested: number;
  currentDailyStreak: number;
  currentWeeklyStreak: number;
  longestDailyStreak: number;
  longestWeeklyStreak: number;
  explorePasses: number;
  lastActiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BadgeDefinition {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  tiers: {
    bronze: { requirement: number; description: string };
    silver: { requirement: number; description: string };
    gold: { requirement: number; description: string };
  };
}

export interface StreakStatus {
  daily: {
    current: number;
    longest: number;
    lastActivity: string | null;
    isActive: boolean;
    hoursUntilExpiry: number | null;
    freezeAvailable: boolean;
  };
  weekly: {
    current: number;
    longest: number;
    pointsThisWeek: number;
    pointsRequired: number;
    daysUntilReset: number;
    isOnTrack: boolean;
  };
}

export interface EncouragementMessage {
  type: "streak_risk" | "streak_broken" | "welcome_back" | "milestone" | "badge_earned";
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
}

export interface ActivitySummary {
  stats: GamificationStats;
  streaks: StreakStatus;
  badges: UserBadge[];
  recentActivity: UserActivity[];
  encouragement?: EncouragementMessage;
}

export const POINT_VALUES: Record<ActivityType, number> = {
  message_sent: 5,
  meeting_scheduled: 25,
  connection_made: 15,
  intro_requested: 10,
  explore_pass: 2,
};

// ============================================
// Moderation Types
// ============================================

export type ModerationContentType = "post" | "reply" | "message" | "profile" | "photo";
export type ModerationReason = "auto_flagged" | "user_report" | "manual_review";
export type ModerationStatus = "pending" | "approved" | "rejected" | "deleted";

export interface ModerationItem {
  id: string;
  contentType: ModerationContentType;
  contentId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  contentSnapshot: string;
  imageUrl?: string;
  reason: ModerationReason;
  reportId?: string;
  status: ModerationStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewerNotes?: string;
  createdAt: Date;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    type: "conversation_starter",
    name: "Conversation Starter",
    description: "Send messages to start meaningful conversations",
    icon: "MessageCircle",
    tiers: {
      bronze: { requirement: 10, description: "Send 10 messages" },
      silver: { requirement: 50, description: "Send 50 messages" },
      gold: { requirement: 100, description: "Send 100 messages" },
    },
  },
  {
    type: "super_connector",
    name: "Super Connector",
    description: "Build your network by making connections",
    icon: "Users",
    tiers: {
      bronze: { requirement: 5, description: "Make 5 connections" },
      silver: { requirement: 25, description: "Make 25 connections" },
      gold: { requirement: 50, description: "Make 50 connections" },
    },
  },
  {
    type: "meeting_master",
    name: "Meeting Master",
    description: "Schedule meetings to deepen relationships",
    icon: "Calendar",
    tiers: {
      bronze: { requirement: 3, description: "Schedule 3 meetings" },
      silver: { requirement: 10, description: "Schedule 10 meetings" },
      gold: { requirement: 25, description: "Schedule 25 meetings" },
    },
  },
  {
    type: "networking_streak",
    name: "Networking Streak",
    description: "Stay consistent with daily engagement",
    icon: "Flame",
    tiers: {
      bronze: { requirement: 7, description: "7-day streak" },
      silver: { requirement: 14, description: "14-day streak" },
      gold: { requirement: 30, description: "30-day streak (max)" },
    },
  },
  {
    type: "weekly_warrior",
    name: "Weekly Warrior",
    description: "Hit your weekly networking goals",
    icon: "Trophy",
    tiers: {
      bronze: { requirement: 4, description: "4-week streak" },
      silver: { requirement: 12, description: "12-week streak" },
      gold: { requirement: 52, description: "52-week streak" },
    },
  },
  {
    type: "thoughtful_curator",
    name: "Thoughtful Curator",
    description: "Use Pass to focus on the best-fit connections",
    icon: "Filter",
    tiers: {
      bronze: { requirement: 5, description: "Pass 5 profiles" },
      silver: { requirement: 25, description: "Pass 25 profiles" },
      gold: { requirement: 100, description: "Pass 100 profiles" },
    },
  },
];

