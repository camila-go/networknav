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
}

export type QuestionType =
  | "single-select"
  | "multi-select"
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

