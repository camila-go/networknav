export { calculateStreakStatus, updateStreaks, freezeStreak } from "./streaks";
export { getUserBadges, checkAndAwardBadges, getBadgeProgress } from "./badges";
export { parseBadgesFromApi } from "./parse-badges";
export type { BadgeProgress } from "./badges";
export {
  getEncouragementMessage,
  getBadgeEarnedMessage,
  getActivityTip,
} from "./encouragement";
export {
  PROFILE_FRAME_TIERS,
  getNewlyUnlockedProfileFrames,
} from "./profile-frames";
export type { ProfileFrameTier } from "./profile-frames";
// applyGamificationUnlockNotifications is server-only (notifications + socket). Import from
// "@/lib/gamification/unlock-notifications" in API routes only — not re-exported here so client
// bundles that import parseBadgesFromApi etc. do not pull next/headers.
