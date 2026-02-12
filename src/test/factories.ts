/**
 * Test factories for creating mock domain objects
 * Each factory returns a valid object with sensible defaults that can be overridden
 */

import type {
  User,
  UserProfile,
  PublicUser,
  Match,
  MatchType,
  Commonality,
  CommonalityCategory,
  Connection,
  ConnectionStatus,
  Message,
  Meeting,
  MeetingStatus,
  MeetingType,
  Notification,
  NotificationType,
  NotificationPreferences,
  QuestionnaireData,
  CalendarEvent,
  CalendarEventStatus,
  CalendarPlatform,
  FreeBusySlot,
} from "@/types";
import type { StoredUser } from "@/lib/stores/users-store";

let counter = 0;
function nextId(): string {
  return crypto.randomUUID();
}

export function createMockUserProfile(overrides?: Partial<UserProfile>): UserProfile {
  counter++;
  return {
    name: `Test User ${counter}`,
    position: "Engineering Manager",
    title: "Senior Director",
    company: "TestCorp",
    photoUrl: undefined,
    location: "New York, NY",
    ...overrides,
  };
}

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: nextId(),
    email: `user${counter}@test.com`,
    passwordHash: "$2a$10$hashedpasswordplaceholder",
    profile: createMockUserProfile(),
    questionnaireCompleted: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function createMockStoredUser(overrides?: Partial<StoredUser>): StoredUser {
  counter++;
  return {
    id: nextId(),
    email: `user${counter}@test.com`,
    passwordHash: "$2a$10$hashedpasswordplaceholder",
    name: `Test User ${counter}`,
    position: "Engineering Manager",
    title: "Senior Director",
    company: "TestCorp",
    photoUrl: undefined,
    location: "New York, NY",
    questionnaireCompleted: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function createMockPublicUser(overrides?: Partial<PublicUser>): PublicUser {
  return {
    id: nextId(),
    profile: createMockUserProfile(),
    questionnaireCompleted: true,
    ...overrides,
  };
}

export function createMockCommonality(overrides?: Partial<Commonality>): Commonality {
  return {
    category: "professional" as CommonalityCategory,
    description: "Both work in Technology",
    weight: 0.8,
    ...overrides,
  };
}

export function createMockMatch(overrides?: Partial<Match>): Match {
  const matchedUser = createMockPublicUser();
  return {
    id: `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: nextId(),
    matchedUserId: matchedUser.id,
    matchedUser,
    type: "high-affinity" as MatchType,
    commonalities: [
      createMockCommonality(),
      createMockCommonality({ category: "hobby", description: "Both enjoy hiking" }),
    ],
    conversationStarters: [
      "What's your take on the latest industry trends?",
      "I noticed we share a passion for hiking!",
    ],
    score: 0.78,
    generatedAt: new Date("2026-01-15"),
    viewed: false,
    passed: false,
    ...overrides,
  };
}

export function createMockConnection(overrides?: Partial<Connection>): Connection {
  return {
    id: nextId(),
    requesterId: nextId(),
    recipientId: nextId(),
    status: "accepted" as ConnectionStatus,
    message: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
    ...overrides,
  };
}

export function createMockMessage(overrides?: Partial<Message>): Message {
  return {
    id: nextId(),
    connectionId: nextId(),
    senderId: nextId(),
    content: "Hello, great to connect!",
    read: false,
    createdAt: new Date("2026-01-15T10:30:00Z"),
    ...overrides,
  };
}

export function createMockMeeting(overrides?: Partial<Meeting>): Meeting {
  return {
    id: nextId(),
    requesterId: nextId(),
    recipientId: nextId(),
    status: "pending" as MeetingStatus,
    duration: 30,
    meetingType: "video" as MeetingType,
    contextMessage: "Would love to chat about leadership strategies",
    proposedTimes: [
      new Date("2026-02-15T14:00:00Z"),
      new Date("2026-02-16T10:00:00Z"),
    ],
    acceptedTime: undefined,
    calendarPlatform: undefined,
    meetingLink: undefined,
    calendarEventId: undefined,
    remindersSent: { day_before: false, hour_before: false },
    createdAt: new Date("2026-01-20"),
    updatedAt: new Date("2026-01-20"),
    ...overrides,
  };
}

export function createMockNotification(overrides?: Partial<Notification>): Notification {
  return {
    id: nextId(),
    userId: nextId(),
    type: "new_matches" as NotificationType,
    title: "New Matches Available",
    body: "You have 3 new matches to review!",
    data: undefined,
    read: false,
    createdAt: new Date("2026-01-15"),
    ...overrides,
  };
}

export function createMockNotificationPreferences(
  overrides?: Partial<NotificationPreferences>
): NotificationPreferences {
  return {
    userId: nextId(),
    email: true,
    inApp: true,
    push: false,
    ...overrides,
  };
}

export function createMockQuestionnaireData(
  overrides?: Partial<QuestionnaireData>
): QuestionnaireData {
  return {
    industry: "technology",
    yearsExperience: "10-15",
    leadershipLevel: "senior-director",
    organizationSize: "1000-5000",
    leadershipPriorities: ["innovation", "talent-development"],
    leadershipChallenges: ["scaling-teams", "change-management"],
    growthAreas: ["executive-presence", "strategic-thinking"],
    networkingGoals: ["mentorship", "industry-insights"],
    rechargeActivities: ["hiking", "reading", "cooking"],
    customInterests: [],
    contentPreferences: ["podcasts", "books"],
    fitnessActivities: ["running", "yoga"],
    idealWeekend: "outdoor-adventure",
    volunteerCauses: ["education", "environment"],
    energizers: ["brainstorming", "mentoring"],
    leadershipPhilosophy: ["servant-leadership", "collaborative"],
    decisionMakingStyle: "data-driven",
    failureApproach: "learn-and-iterate",
    relationshipValues: ["trust", "authenticity"],
    communicationStyle: "direct",
    leadershipSeason: "growth",
    ...overrides,
  };
}

export function createMockCalendarEvent(overrides?: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: nextId(),
    title: "Team Standup",
    startTime: new Date("2026-02-15T09:00:00Z"),
    endTime: new Date("2026-02-15T09:30:00Z"),
    isAllDay: false,
    status: "confirmed" as CalendarEventStatus,
    source: "google" as CalendarPlatform,
    ...overrides,
  };
}

export function createMockFreeBusySlot(overrides?: Partial<FreeBusySlot>): FreeBusySlot {
  return {
    startTime: new Date("2026-02-15T09:00:00Z"),
    endTime: new Date("2026-02-15T09:30:00Z"),
    status: "busy",
    ...overrides,
  };
}
