import type { GamificationStats, StreakStatus, EncouragementMessage } from "@/types";

// ============================================
// Encouragement Messages
// ============================================

const STREAK_RISK_MESSAGES = [
  "Your {streak}-day streak ends soon! Quick message to keep it alive?",
  "Don't let your {streak}-day streak slip away! A simple connection can save it.",
  "Just {hours} hours left to maintain your {streak}-day networking streak!",
];

const STREAK_BROKEN_MESSAGES = [
  "Your {streak}-day streak ended, but every expert was once a beginner. Let's start fresh!",
  "Streaks come and go, but your network is forever. Ready for a fresh start?",
  "You had an impressive {streak}-day run! Time to build an even longer one.",
];

const WELCOME_BACK_MESSAGES = [
  "Welcome back! Your network missed you. Ready to reconnect?",
  "Great to see you again! Let's pick up where you left off.",
  "You're back! Time to strengthen those professional relationships.",
];

const MILESTONE_MESSAGES = [
  "Amazing! You've reached {points} connection points!",
  "You're on fire! {streak} days of consistent networking!",
  "Incredible progress! You've sent {count} messages this week!",
];

const BADGE_EARNED_MESSAGES = [
  "You've earned the {badge} badge! Keep up the great work!",
  "New badge unlocked: {badge}! Your networking skills are leveling up!",
  "Congratulations on earning {badge}! You're becoming a networking pro!",
];

// ============================================
// Helper Functions
// ============================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatMessage(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
  }
  return result;
}

// ============================================
// Get Encouragement Message
// ============================================

export async function getEncouragementMessage(
  userId: string,
  stats: GamificationStats,
  streaks: StreakStatus
): Promise<EncouragementMessage | undefined> {
  const now = new Date();
  const lastActive = stats.lastActiveAt;
  const daysSinceActive = lastActive 
    ? Math.floor((now.getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  // Priority 1: Streak at risk (within 6 hours of expiry)
  if (streaks.daily.isActive && streaks.daily.hoursUntilExpiry !== null) {
    if (streaks.daily.hoursUntilExpiry <= 6 && streaks.daily.current >= 3) {
      return {
        type: "streak_risk",
        title: "Streak at Risk!",
        message: formatMessage(randomChoice(STREAK_RISK_MESSAGES), {
          streak: streaks.daily.current,
          hours: Math.ceil(streaks.daily.hoursUntilExpiry),
        }),
        actionText: "Send a Message",
        actionUrl: "/messages",
      };
    }
  }

  // Priority 2: Streak just broken (was active, now showing 0 but had a streak before)
  if (!streaks.daily.isActive && streaks.daily.longest > 3 && daysSinceActive <= 3) {
    const previousStreak = streaks.daily.longest;
    return {
      type: "streak_broken",
      title: "Streak Ended",
      message: formatMessage(randomChoice(STREAK_BROKEN_MESSAGES), {
        streak: previousStreak,
      }),
      actionText: "Start Fresh",
      actionUrl: "/dashboard",
    };
  }

  // Priority 3: Welcome back after absence (3+ days)
  if (daysSinceActive >= 3 && daysSinceActive < 30) {
    return {
      type: "welcome_back",
      title: "Welcome Back!",
      message: randomChoice(WELCOME_BACK_MESSAGES),
      actionText: "View Matches",
      actionUrl: "/dashboard",
    };
  }

  // Priority 4: Milestones
  const milestones = [100, 250, 500, 1000, 2500, 5000];
  for (const milestone of milestones) {
    if (stats.totalPoints >= milestone && stats.totalPoints < milestone + 50) {
      return {
        type: "milestone",
        title: "Milestone Reached!",
        message: formatMessage(randomChoice(MILESTONE_MESSAGES), {
          points: milestone,
          streak: streaks.daily.current,
          count: stats.messagesSent,
        }),
      };
    }
  }

  // Priority 5: Weekly progress encouragement (mid-week)
  const dayOfWeek = now.getUTCDay();
  if (dayOfWeek >= 3 && dayOfWeek <= 5) { // Wed-Fri
    if (!streaks.weekly.isOnTrack && streaks.weekly.pointsThisWeek > 0) {
      const pointsNeeded = streaks.weekly.pointsRequired - streaks.weekly.pointsThisWeek;
      return {
        type: "streak_risk",
        title: "Weekly Goal Check-in",
        message: `You need ${pointsNeeded} more points to hit your weekly goal. You've got ${streaks.weekly.daysUntilReset} days left!`,
        actionText: "Boost Points",
        actionUrl: "/dashboard",
      };
    }
  }

  // No urgent message needed
  return undefined;
}

// ============================================
// Get Badge Earned Message
// ============================================

export function getBadgeEarnedMessage(badgeName: string, tier: string): EncouragementMessage {
  return {
    type: "badge_earned",
    title: "New Badge Earned!",
    message: formatMessage(randomChoice(BADGE_EARNED_MESSAGES), {
      badge: `${tier.charAt(0).toUpperCase() + tier.slice(1)} ${badgeName}`,
    }),
  };
}

// ============================================
// Get Activity Tips
// ============================================

export function getActivityTip(currentPoints: number, dailyStreak: number): string {
  if (currentPoints === 0) {
    return "Send your first message to start earning points!";
  }
  
  if (dailyStreak === 0) {
    return "Complete any activity today to start a new streak!";
  }
  
  if (dailyStreak < 7) {
    return `${7 - dailyStreak} more days to earn your first streak badge!`;
  }
  
  if (dailyStreak >= 7 && dailyStreak < 30) {
    return `Amazing ${dailyStreak}-day streak! Keep going for Silver!`;
  }
  
  return `Incredible ${dailyStreak}-day streak! You're a networking legend!`;
}
