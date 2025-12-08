/**
 * Notification Service
 * 
 * Handles creating and managing notifications for users
 */

import type { Notification, NotificationType } from "@/types";
import { notifications, notificationPreferences, getDefaultPreferences } from "@/lib/stores";

// ============================================
// Notification Templates
// ============================================

interface NotificationTemplate {
  title: string;
  body: string;
}

const NOTIFICATION_TEMPLATES: Record<NotificationType, (data?: Record<string, unknown>) => NotificationTemplate> = {
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
  
  new_message: (data) => ({
    title: `New message from ${data?.senderName || "a connection"}`,
    body: data?.preview as string || "You have a new message waiting.",
  }),
  
  request_reminder: (data) => ({
    title: "Pending connection request",
    body: `${data?.senderName || "Someone"} is waiting for your response. Don't miss this connection!`,
  }),
  
  questionnaire_reminder: () => ({
    title: "Complete your profile",
    body: "Finish your questionnaire to start receiving personalized matches.",
  }),
};

// ============================================
// Core Functions
// ============================================

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
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

  return notification;
}

/**
 * Get all notifications for a user
 */
export function getNotifications(userId: string): Notification[] {
  return notifications.get(userId) || [];
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
  return true;
}

/**
 * Get user's notification preferences
 */
export function getPreferences(userId: string) {
  return notificationPreferences.get(userId) || getDefaultPreferences(userId);
}

/**
 * Update user's notification preferences
 */
export function updatePreferences(
  userId: string,
  updates: Partial<{ email: boolean; inApp: boolean; push: boolean }>
) {
  const current = getPreferences(userId);
  const updated = { ...current, ...updates };
  notificationPreferences.set(userId, updated);
  return updated;
}

/**
 * Check if user should receive a notification type
 */
export function shouldNotify(userId: string, _channel: "email" | "inApp" | "push"): boolean {
  const prefs = getPreferences(userId);
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

