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

