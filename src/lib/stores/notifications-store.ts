/**
 * In-memory notifications store (replace with database in production)
 */

import type { Notification, NotificationPreferences } from "@/types";

export const notifications = new Map<string, Notification[]>();
export const notificationPreferences = new Map<string, NotificationPreferences>();

// Default notification preferences
export function getDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    email: true,
    inApp: true,
    push: true,
  };
}

