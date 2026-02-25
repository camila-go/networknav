/**
 * In-memory notifications store (replace with database in production)
 *
 * Uses globalThis so the Maps are shared across Next.js route compilations.
 */

import type { Notification, NotificationPreferences } from "@/types";

const g = globalThis as unknown as {
  __netnav_notifications?: Map<string, Notification[]>;
  __netnav_notificationPrefs?: Map<string, NotificationPreferences>;
};

export const notifications = (g.__netnav_notifications ??= new Map<string, Notification[]>());
export const notificationPreferences = (g.__netnav_notificationPrefs ??= new Map<string, NotificationPreferences>());

// Default notification preferences
export function getDefaultPreferences(userId: string): NotificationPreferences {
  return {
    userId,
    email: true,
    inApp: true,
    push: true,
  };
}
