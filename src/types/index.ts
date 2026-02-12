// ============================================
// Core User Types
// ============================================

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  questionnaireCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  name: string;
  position: string;
  title: string;
  company?: string;
  photoUrl?: string;
  location?: string;
}

export interface PublicUser {
  id: string;
  profile: UserProfile;
  questionnaireCompleted: boolean;
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

export interface QuestionnaireData {
  // Section 1: Your Leadership Context (4 questions)
  industry?: string;
  yearsExperience?: string;
  leadershipLevel?: string;
  organizationSize?: string;

  // Section 2: What You're Building & Solving (4 questions)
  leadershipPriorities?: string[];
  leadershipChallenges?: string[];
  growthAreas?: string[];
  networkingGoals?: string[];

  // Section 3: Beyond the Boardroom (6 questions)
  rechargeActivities?: string[];
  customInterests?: string[]; // User-typed custom interests
  contentPreferences?: string[];
  fitnessActivities?: string[];
  idealWeekend?: string;
  volunteerCauses?: string[];
  energizers?: string[];

  // Section 4: Your Leadership Style (6 questions)
  leadershipPhilosophy?: string[];
  decisionMakingStyle?: string;
  failureApproach?: string;
  relationshipValues?: string[]; // Ranked top 3
  communicationStyle?: string;
  leadershipSeason?: string;
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
  type: QuestionType;
  options?: QuestionOption[];
  required: boolean;
  minSelections?: number;
  maxSelections?: number;
  skipLogic?: SkipLogicRule[];
  customFieldId?: keyof QuestionnaireData; // For multi-select-custom: ID of field to store custom values
  customFieldPlaceholder?: string; // Placeholder text for custom input
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
  | "questionnaire_reminder";

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
}

// ============================================
// Search & Filter Types
// ============================================

export interface SearchFilters {
  industries?: string[];
  leadershipLevels?: string[];
  organizationSizes?: string[];
  yearsExperience?: string[];
  leadershipChallenges?: string[];
  leadershipPriorities?: string[];
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
  topCommonalities: Commonality[];
  questionnaire?: Partial<QuestionnaireData>;
}

// ============================================
// Network Graph Types
// ============================================

export interface NetworkNode {
  id: string;
  name: string;
  title: string;
  company?: string;
  matchType: MatchType | "neutral";
  commonalityCount: number;
  commonalities: string[];
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
  position: string;
  title: string;
  company?: string;
}

