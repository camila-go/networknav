import { checkAndAwardBadges } from "@/lib/gamification/badges";
import { getNewlyUnlockedProfileFrames } from "@/lib/gamification/profile-frames";
import {
  notifyBadgeEarned,
  notifyProfileFrameUnlocked,
} from "@/lib/notifications/notification-service";
import { BADGE_DEFINITIONS, type ActivityType, type BadgeTier, type BadgeType } from "@/types";

function formatBadgeLabel(badgeType: BadgeType, tier: BadgeTier): string {
  const def = BADGE_DEFINITIONS.find((d) => d.type === badgeType);
  const name =
    def?.name ??
    badgeType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  return `${tierLabel} ${name}`;
}

/**
 * After stats rows reflect new points, award any badges and notify for new badges
 * and newly unlocked profile frames.
 */
export async function applyGamificationUnlockNotifications(
  userId: string,
  prevTotalPoints: number,
  newTotalPoints: number,
  activityType?: ActivityType
): Promise<void> {
  const newBadges = await checkAndAwardBadges(userId, activityType);
  for (const b of newBadges) {
    notifyBadgeEarned(
      userId,
      formatBadgeLabel(b.badgeType, b.tier),
      b.badgeType,
      b.tier
    );
  }

  for (const frame of getNewlyUnlockedProfileFrames(prevTotalPoints, newTotalPoints)) {
    notifyProfileFrameUnlocked(userId, frame.name, frame.minPoints);
  }
}
