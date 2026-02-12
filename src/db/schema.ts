import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type {
  QuestionnaireData,
  Commonality,
  ConnectionStatus,
  MatchType,
  NotificationType,
  MeetingStatus,
  MeetingType,
  CalendarPlatform,
} from "@/types";

// ============================================
// Users Table
// ============================================

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  photoUrl: text("photo_url"),
  location: varchar("location", { length: 255 }),
  questionnaireCompleted: boolean("questionnaire_completed")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  questionnaire: one(questionnaireResponses),
  sentConnections: many(connections, { relationName: "requester" }),
  receivedConnections: many(connections, { relationName: "recipient" }),
  matches: many(matches, { relationName: "user" }),
  matchedBy: many(matches, { relationName: "matchedUser" }),
  messages: many(messages),
  notifications: many(notifications),
  sentMeetingRequests: many(meetingRequests, { relationName: "meetingRequester" }),
  receivedMeetingRequests: many(meetingRequests, { relationName: "meetingRecipient" }),
  hostedMeetings: many(scheduledMeetings, { relationName: "hostedMeetings" }),
  attendedMeetings: many(scheduledMeetings, { relationName: "attendedMeetings" }),
  meetingIntegrations: many(meetingIntegrations),
  submittedReports: many(reports, { relationName: "submittedReports" }),
  receivedReports: many(reports, { relationName: "receivedReports" }),
}));

// ============================================
// Questionnaire Responses Table
// ============================================

export const questionnaireResponses = pgTable("questionnaire_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  responses: jsonb("responses").$type<QuestionnaireData>().notNull(),
  completionPercentage: integer("completion_percentage").default(0).notNull(),
  completedAt: timestamp("completed_at"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const questionnaireResponsesRelations = relations(
  questionnaireResponses,
  ({ one }) => ({
    user: one(users, {
      fields: [questionnaireResponses.userId],
      references: [users.id],
    }),
  })
);

// ============================================
// Matches Table
// ============================================

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  matchedUserId: uuid("matched_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).$type<MatchType>().notNull(),
  commonalities: jsonb("commonalities").$type<Commonality[]>().notNull(),
  conversationStarters: jsonb("conversation_starters")
    .$type<string[]>()
    .notNull(),
  score: real("score").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  viewed: boolean("viewed").default(false).notNull(),
  passed: boolean("passed").default(false).notNull(),
});

export const matchesRelations = relations(matches, ({ one }) => ({
  user: one(users, {
    fields: [matches.userId],
    references: [users.id],
    relationName: "user",
  }),
  matchedUser: one(users, {
    fields: [matches.matchedUserId],
    references: [users.id],
    relationName: "matchedUser",
  }),
}));

// ============================================
// Connections Table
// ============================================

export const connections = pgTable("connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 })
    .$type<ConnectionStatus>()
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const connectionsRelations = relations(connections, ({ one, many }) => ({
  requester: one(users, {
    fields: [connections.requesterId],
    references: [users.id],
    relationName: "requester",
  }),
  recipient: one(users, {
    fields: [connections.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
  messages: many(messages),
}));

// ============================================
// Messages Table
// ============================================

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  connectionId: uuid("connection_id")
    .notNull()
    .references(() => connections.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  connection: one(connections, {
    fields: [messages.connectionId],
    references: [connections.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

// ============================================
// Notifications Table
// ============================================

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).$type<NotificationType>().notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ============================================
// Notification Preferences Table
// ============================================

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  email: boolean("email").default(true).notNull(),
  inApp: boolean("in_app").default(true).notNull(),
  push: boolean("push").default(true).notNull(),
});

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  })
);

// ============================================
// Sessions Table (for JWT refresh tokens)
// ============================================

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshToken: text("refresh_token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ============================================
// Meeting Requests Table
// ============================================

export const meetingRequests = pgTable("meeting_requests", {
  id: text("id").primaryKey(), // Custom format: mtg_timestamp_random
  requesterId: uuid("requester_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 })
    .$type<MeetingStatus>()
    .default("pending")
    .notNull(),
  duration: integer("duration").notNull(), // minutes
  meetingType: varchar("meeting_type", { length: 20 })
    .$type<MeetingType>()
    .notNull(),
  contextMessage: text("context_message"),
  proposedTimes: jsonb("proposed_times").$type<string[]>().notNull(),
  acceptedTime: timestamp("accepted_time"),
  calendarPlatform: varchar("calendar_platform", { length: 20 })
    .$type<CalendarPlatform>(),
  meetingLink: text("meeting_link"),
  calendarEventId: text("calendar_event_id"),
  remindersSent: jsonb("reminders_sent")
    .$type<{ day_before: boolean; hour_before: boolean }>()
    .default({ day_before: false, hour_before: false })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const meetingRequestsRelations = relations(
  meetingRequests,
  ({ one }) => ({
    requester: one(users, {
      fields: [meetingRequests.requesterId],
      references: [users.id],
      relationName: "meetingRequester",
    }),
    recipient: one(users, {
      fields: [meetingRequests.recipientId],
      references: [users.id],
      relationName: "meetingRecipient",
    }),
  })
);

// ============================================
// Scheduled Meetings Table (calendar-integrated)
// ============================================

export const scheduledMeetings = pgTable("scheduled_meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  guestUserId: uuid("guest_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 20 }).notNull(), // google_meet | teams
  meetingLink: text("meeting_link").notNull(),
  meetingId: text("meeting_id"),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: varchar("status", { length: 20 }).default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scheduledMeetingsRelations = relations(
  scheduledMeetings,
  ({ one }) => ({
    host: one(users, {
      fields: [scheduledMeetings.hostUserId],
      references: [users.id],
      relationName: "hostedMeetings",
    }),
    guest: one(users, {
      fields: [scheduledMeetings.guestUserId],
      references: [users.id],
      relationName: "attendedMeetings",
    }),
  })
);

// ============================================
// Meeting Integrations Table (OAuth tokens)
// ============================================

export const meetingIntegrations = pgTable("meeting_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 20 }).notNull(), // google | microsoft
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Unique constraint on (user_id, platform) enforced at database level
});

export const meetingIntegrationsRelations = relations(
  meetingIntegrations,
  ({ one }) => ({
    user: one(users, {
      fields: [meetingIntegrations.userId],
      references: [users.id],
    }),
  })
);

// ============================================
// Reports Table (user reporting)
// ============================================

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: uuid("reported_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 50 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
    relationName: "submittedReports",
  }),
  reportedUser: one(users, {
    fields: [reports.reportedUserId],
    references: [users.id],
    relationName: "receivedReports",
  }),
}));

