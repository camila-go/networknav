import type { Notification, NotificationType } from "@/types";
import { SHOW_GAMIFICATION_UI } from "@/lib/feature-flags";

const GAMIFICATION_ONLY_NOTIFICATION_TYPES = new Set<NotificationType>([
  "badge_earned",
  "profile_frame_unlocked",
]);

export function isGamificationNotificationType(type: string): boolean {
  return GAMIFICATION_ONLY_NOTIFICATION_TYPES.has(type as NotificationType);
}

export function filterNotificationsForPresentation(list: Notification[]): Notification[] {
  if (SHOW_GAMIFICATION_UI) return list;
  return list.filter((n) => !GAMIFICATION_ONLY_NOTIFICATION_TYPES.has(n.type));
}
