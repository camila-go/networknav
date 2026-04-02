/**
 * Notification Service
 *
 * Handles creating and managing notifications for users
 */

import type { Notification, NotificationType } from "@/types";
import { notifications, notificationPreferences, getDefaultPreferences } from "@/lib/stores";
import { filterNotificationsForPresentation } from "@/lib/notifications/presentation-filter";
import { getSocketInstance } from "@/lib/socket";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

// ============================================
// Supabase Row Types
// ============================================

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

interface NotificationPrefsRow {
  user_id: string;
  email: boolean;
  in_app: boolean; // DB column is in_app; TS uses inApp
  push: boolean;
}

// ============================================
// Supabase Helpers (private)
// ============================================

async function insertNotificationToSupabase(notification: Notification): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  const { error } = await supabaseAdmin.from("notifications").insert({
    id: notification.id,
    user_id: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data ?? null,
    read: notification.read,
    created_at: notification.createdAt.toISOString(),
  } as never);

  if (error) {
    console.error("[Notifications] Supabase insert error:", error);
  }
}

async function loadNotificationsFromSupabase(userId: string): Promise<Notification[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[Notifications] Supabase load error:", error);
    return [];
  }

  return ((data || []) as NotificationRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    body: row.body,
    data: row.data ?? undefined,
    read: row.read,
    createdAt: new Date(row.created_at),
  }));
}

async function markNotificationReadInSupabase(notificationId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true } as never)
    .eq("id", notificationId);

  if (error) {
    console.error("[Notifications] Supabase mark-read error:", error);
  }
}

async function markAllNotificationsReadInSupabase(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ read: true } as never)
    .eq("user_id", userId)
    .eq("read", false);

  if (error) {
    console.error("[Notifications] Supabase mark-all-read error:", error);
  }
}

async function deleteNotificationFromSupabase(notificationId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    console.error("[Notifications] Supabase delete error:", error);
  }
}

async function loadPreferencesFromSupabase(
  userId: string
): Promise<{ email: boolean; inApp: boolean; push: boolean } | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  const row = data as NotificationPrefsRow;
  return { email: row.email, inApp: row.in_app, push: row.push };
}

async function savePreferencesToSupabase(
  userId: string,
  prefs: { email: boolean; inApp: boolean; push: boolean }
): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        email: prefs.email,
        in_app: prefs.inApp, // snake_case ↔ camelCase mapping
        push: prefs.push,
      } as never,
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[Notifications] Supabase prefs save error:", error);
  }
}

// ============================================
// Notification Templates
// ============================================

interface NotificationTemplate {
  title: string;
  body: string;
}

const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  (data?: Record<string, unknown>) => NotificationTemplate
> = {
  new_matches: () => ({
    title: "New matches available! 🎯",
    body: "Check out 6 new leaders we think you should connect with this week.",
  }),

  connection_request: (data) => ({
    title: `${data?.senderName || "Someone"} wants to connect`,
    body: `${data?.senderName || "A leader"} from ${data?.company || "the conference"} sent you a connection request.`,
  }),

  connection_accepted: (data) => ({
    title: `${data?.recipientName || "Your connection"} accepted! 🎉`,
    body: `You're now connected with ${data?.recipientName || "them"}. Start a conversation!`,
  }),

  meeting_request: (data) => ({
    title: `☕ ${data?.senderName || "Someone"} wants to meet!`,
    body: `${data?.senderName || "A leader"} from ${data?.company || "the conference"} requested a ${data?.meetingType || "meeting"} with you.`,
  }),

  meeting_accepted: (data) => ({
    title: `🎉 Meeting confirmed with ${data?.recipientName || "your connection"}!`,
    body: `${data?.recipientName || "They"} accepted your meeting request. Check your calendar!`,
  }),

  meeting_declined: (data) => ({
    title: `Meeting update from ${data?.recipientName || "your connection"}`,
    body: `${data?.recipientName || "They"} couldn't make the proposed times. Try suggesting new times!`,
  }),

  new_message: (data) => ({
    title: `New message from ${data?.senderName || "a connection"}`,
    body: (data?.preview as string) || "You have a new message waiting.",
  }),

  request_reminder: (data) => ({
    title: "Pending connection request",
    body: `${data?.senderName || "Someone"} is waiting for your response. Don't miss this connection!`,
  }),

  questionnaire_reminder: () => ({
    title: "Complete your profile",
    body: "Finish your questionnaire to start receiving personalized matches.",
  }),

  badge_earned: (data) => ({
    title: "New badge earned",
    body: `You unlocked ${(data?.badgeLabel as string) || "a new badge"}. View it on your profile.`,
  }),

  profile_frame_unlocked: (data) => ({
    title: "New profile frame unlocked",
    body: `You reached ${String(data?.minPoints ?? "")} connection points. The "${(data?.frameName as string) || "new"}" profile frame is now available on your profile.`,
  }),

  content_removed: (data) => ({
    title: "Content removed",
    body: `Your ${(data?.contentType as string) || "content"} was removed for violating community guidelines.`,
  }),

  content_warning: (data) => ({
    title: "Content warning",
    body: `Your ${(data?.contentType as string) || "content"} has been flagged for review.`,
  }),
};

// ============================================
// Core Functions
// ============================================

/**
 * Notifications + unread count as shown in the app (respects SHOW_GAMIFICATION_UI).
 */
export async function getNotificationsForPresentation(
  userId: string
): Promise<{ notifications: Notification[]; unreadCount: number }> {
  const all = await getNotifications(userId);
  const notifications = filterNotificationsForPresentation(all);
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

/**
 * Create a new notification for a user
 */
export function createNotification(
  userId: string,
  type: NotificationType,
  data?: Record<string, unknown>
): Notification {
  const template = NOTIFICATION_TEMPLATES[type](data);

  const notification: Notification = {
    id: crypto.randomUUID(),
    userId,
    type,
    title: template.title,
    body: template.body,
    data,
    read: false,
    createdAt: new Date(),
  };

  // Add to user's notifications
  const userNotifications = notifications.get(userId) || [];
  userNotifications.unshift(notification); // Add to beginning

  // Keep only last 50 notifications
  if (userNotifications.length > 50) {
    userNotifications.pop();
  }

  notifications.set(userId, userNotifications);

  // Non-blocking Supabase write
  insertNotificationToSupabase(notification).catch(() => {});

  // Emit real-time notification via Socket.io
  const io = getSocketInstance();
  if (io) {
    io.to(`user:${userId}`).emit("notification:new", {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt.toISOString(),
    });
  }

  return notification;
}

/**
 * Get all notifications for a user
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
  const inMemory = notifications.get(userId);
  if (inMemory && inMemory.length > 0) {
    return inMemory;
  }

  // Supabase fallback when in-memory is empty
  if (isSupabaseConfigured) {
    const loaded = await loadNotificationsFromSupabase(userId);
    if (loaded.length > 0) {
      notifications.set(userId, loaded);
      return loaded;
    }
  }

  return inMemory || [];
}

/**
 * Get unread notification count
 */
export function getUnreadCount(userId: string): number {
  const userNotifications = notifications.get(userId) || [];
  return userNotifications.filter((n) => !n.read).length;
}

/**
 * Mark a notification as read
 */
export function markAsRead(userId: string, notificationId: string): boolean {
  const userNotifications = notifications.get(userId);
  if (!userNotifications) return false;

  const notification = userNotifications.find((n) => n.id === notificationId);
  if (!notification) return false;

  notification.read = true;
  notifications.set(userId, userNotifications);

  // Non-blocking Supabase update
  markNotificationReadInSupabase(notificationId).catch(() => {});

  return true;
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(userId: string): number {
  const userNotifications = notifications.get(userId);
  if (!userNotifications) return 0;

  let count = 0;
  for (const notification of userNotifications) {
    if (!notification.read) {
      notification.read = true;
      count++;
    }
  }

  notifications.set(userId, userNotifications);

  // Non-blocking Supabase update
  if (count > 0) {
    markAllNotificationsReadInSupabase(userId).catch(() => {});
  }

  return count;
}

/**
 * Delete a notification
 */
export function deleteNotification(userId: string, notificationId: string): boolean {
  const userNotifications = notifications.get(userId);
  if (!userNotifications) return false;

  const index = userNotifications.findIndex((n) => n.id === notificationId);
  if (index === -1) return false;

  userNotifications.splice(index, 1);
  notifications.set(userId, userNotifications);

  // Non-blocking Supabase delete
  deleteNotificationFromSupabase(notificationId).catch(() => {});

  return true;
}

/**
 * Get user's notification preferences
 */
export async function getPreferences(userId: string) {
  const inMemory = notificationPreferences.get(userId);
  if (inMemory) return inMemory;

  // Supabase fallback
  if (isSupabaseConfigured) {
    const loaded = await loadPreferencesFromSupabase(userId);
    if (loaded) {
      const prefs = { userId, ...loaded };
      notificationPreferences.set(userId, prefs);
      return prefs;
    }
  }

  return getDefaultPreferences(userId);
}

/**
 * Update user's notification preferences
 */
export async function updatePreferences(
  userId: string,
  updates: Partial<{ email: boolean; inApp: boolean; push: boolean }>
) {
  const current = await getPreferences(userId);
  const updated = { ...current, ...updates };
  notificationPreferences.set(userId, updated);

  // Non-blocking Supabase upsert
  savePreferencesToSupabase(userId, updated).catch(() => {});

  return updated;
}

/**
 * Check if user should receive a notification type
 */
export function shouldNotify(userId: string, _channel: "email" | "inApp" | "push"): boolean {
  const prefs = notificationPreferences.get(userId) || getDefaultPreferences(userId);
  return prefs[_channel];
}

// ============================================
// Notification Triggers
// ============================================

/**
 * Notify user of new weekly matches
 */
export function notifyNewMatches(userId: string): Notification {
  return createNotification(userId, "new_matches");
}

/**
 * Notify user of a connection request
 */
export function notifyConnectionRequest(
  recipientId: string,
  senderName: string,
  company?: string
): Notification {
  return createNotification(recipientId, "connection_request", {
    senderName,
    company,
  });
}

/**
 * Notify user that their connection request was accepted
 */
export function notifyConnectionAccepted(
  requesterId: string,
  recipientName: string
): Notification {
  return createNotification(requesterId, "connection_accepted", {
    recipientName,
  });
}

/**
 * Notify user of a new message
 */
export function notifyNewMessage(
  recipientId: string,
  senderName: string,
  messagePreview: string
): Notification {
  return createNotification(recipientId, "new_message", {
    senderName,
    preview: messagePreview.slice(0, 100) + (messagePreview.length > 100 ? "..." : ""),
  });
}

/**
 * Remind user about pending connection request
 */
export function notifyRequestReminder(
  recipientId: string,
  senderName: string
): Notification {
  return createNotification(recipientId, "request_reminder", {
    senderName,
  });
}

/**
 * Remind user to complete questionnaire
 */
export function notifyQuestionnaireReminder(userId: string): Notification {
  return createNotification(userId, "questionnaire_reminder");
}

/**
 * Notify user of a meeting request
 */
export function notifyMeetingRequest(
  recipientId: string,
  senderName: string,
  company?: string,
  meetingType?: string
): Notification {
  return createNotification(recipientId, "meeting_request", {
    senderName,
    company,
    meetingType: meetingType || "meeting",
  });
}

/**
 * Notify user that their meeting request was accepted
 */
export function notifyMeetingAccepted(
  requesterId: string,
  recipientName: string
): Notification {
  return createNotification(requesterId, "meeting_accepted", {
    recipientName,
  });
}

/**
 * Notify user that their meeting request was declined
 */
export function notifyMeetingDeclined(
  requesterId: string,
  recipientName: string
): Notification {
  return createNotification(requesterId, "meeting_declined", {
    recipientName,
  });
}

export function notifyBadgeEarned(
  userId: string,
  badgeLabel: string,
  badgeType: string,
  tier: string
): Notification {
  return createNotification(userId, "badge_earned", {
    badgeLabel,
    badgeType,
    tier,
  });
}

export function notifyProfileFrameUnlocked(
  userId: string,
  frameName: string,
  minPoints: number
): Notification {
  return createNotification(userId, "profile_frame_unlocked", {
    frameName,
    minPoints,
  });
}
