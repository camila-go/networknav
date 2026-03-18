import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  ActivityType,
  BadgeType,
  BadgeTier,
  UserBadge,
  BADGE_DEFINITIONS,
} from "@/types";

// Badge requirements by type and tier
const BADGE_REQUIREMENTS: Record<BadgeType, Record<BadgeTier, number>> = {
  conversation_starter: { bronze: 10, silver: 50, gold: 100 },
  super_connector: { bronze: 5, silver: 25, gold: 50 },
  meeting_master: { bronze: 3, silver: 10, gold: 25 },
  networking_streak: { bronze: 7, silver: 30, gold: 90 },
  weekly_warrior: { bronze: 4, silver: 12, gold: 52 },
  thoughtful_curator: { bronze: 5, silver: 25, gold: 100 },
};

// Map activity types to badge types
const ACTIVITY_TO_BADGE: Partial<Record<ActivityType, BadgeType>> = {
  message_sent: "conversation_starter",
  connection_made: "super_connector",
  meeting_scheduled: "meeting_master",
};

// ============================================
// Supabase Row Types
// ============================================

interface BadgeRow {
  id: string;
  user_id: string;
  badge_type: string;
  tier: string;
  progress: number;
  earned_at: string;
  updated_at: string;
}

interface StatsRow {
  messages_sent: number;
  meetings_scheduled: number;
  connections_made: number;
  intros_requested: number;
  explore_passes?: number;
  current_daily_streak: number;
  current_weekly_streak: number;
  longest_daily_streak: number;
  longest_weekly_streak: number;
}

// ============================================
// Helper Functions
// ============================================

function mapRowToBadge(row: BadgeRow): UserBadge {
  return {
    id: row.id,
    userId: row.user_id,
    badgeType: row.badge_type as BadgeType,
    tier: row.tier as BadgeTier,
    progress: row.progress,
    earnedAt: new Date(row.earned_at),
    updatedAt: new Date(row.updated_at),
  };
}

function getNextTier(currentTier: BadgeTier | null): BadgeTier | null {
  if (!currentTier) return "bronze";
  if (currentTier === "bronze") return "silver";
  if (currentTier === "silver") return "gold";
  return null; // Already at gold
}

// ============================================
// Get User Badges
// ============================================

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("user_badges")
    .select("*")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) {
    console.error("[Badges] Error fetching badges:", error);
    return [];
  }

  return (data as BadgeRow[]).map(mapRowToBadge);
}

// ============================================
// Check and Award Badges
// ============================================

export async function checkAndAwardBadges(
  userId: string,
  activityType?: ActivityType
): Promise<UserBadge[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];

  // Get current stats
  const { data: statsData, error: statsError } = await supabaseAdmin
    .from("user_gamification_stats")
    .select("messages_sent, meetings_scheduled, connections_made, intros_requested, explore_passes, current_daily_streak, current_weekly_streak, longest_daily_streak, longest_weekly_streak")
    .eq("user_id", userId)
    .single();

  if (statsError || !statsData) {
    console.error("[Badges] Error fetching stats:", statsError);
    return [];
  }

  const stats = statsData as StatsRow;

  // Get existing badges
  const existingBadges = await getUserBadges(userId);
  const newBadges: UserBadge[] = [];

  // Check each badge type
  const badgeChecks: { type: BadgeType; progress: number }[] = [
    { type: "conversation_starter", progress: stats.messages_sent },
    { type: "super_connector", progress: stats.connections_made },
    { type: "meeting_master", progress: stats.meetings_scheduled },
    { type: "networking_streak", progress: stats.longest_daily_streak },
    { type: "weekly_warrior", progress: stats.longest_weekly_streak },
    { type: "thoughtful_curator", progress: stats.explore_passes ?? 0 },
  ];

  for (const check of badgeChecks) {
    const awarded = await checkAndAwardBadge(
      userId,
      check.type,
      check.progress,
      existingBadges
    );
    if (awarded) {
      newBadges.push(awarded);
    }
  }

  return newBadges;
}

async function checkAndAwardBadge(
  userId: string,
  badgeType: BadgeType,
  progress: number,
  existingBadges: UserBadge[]
): Promise<UserBadge | null> {
  if (!supabaseAdmin) return null;

  const requirements = BADGE_REQUIREMENTS[badgeType];
  const existingForType = existingBadges.filter(b => b.badgeType === badgeType);
  
  // Find highest earned tier
  const earnedTiers = existingForType.map(b => b.tier);
  let highestTier: BadgeTier | null = null;
  if (earnedTiers.includes("gold")) highestTier = "gold";
  else if (earnedTiers.includes("silver")) highestTier = "silver";
  else if (earnedTiers.includes("bronze")) highestTier = "bronze";

  // Check if eligible for next tier
  const nextTier = getNextTier(highestTier);
  if (!nextTier) return null; // Already at gold

  const requirement = requirements[nextTier];
  if (progress < requirement) return null; // Not yet eligible

  // Check if already have this tier
  if (existingForType.some(b => b.tier === nextTier)) return null;

  // Award the badge
  const { data, error } = await supabaseAdmin
    .from("user_badges")
    .insert({
      user_id: userId,
      badge_type: badgeType,
      tier: nextTier,
      progress,
    })
    .select()
    .single();

  if (error) {
    console.error("[Badges] Error awarding badge:", error);
    return null;
  }

  console.log(`[Badges] Awarded ${nextTier} ${badgeType} to user ${userId}`);
  return mapRowToBadge(data as BadgeRow);
}

// ============================================
// Get Badge Progress
// ============================================

export interface BadgeProgress {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  currentTier: BadgeTier | null;
  nextTier: BadgeTier | null;
  currentProgress: number;
  nextRequirement: number | null;
  percentToNext: number;
}

export async function getBadgeProgress(userId: string): Promise<BadgeProgress[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];

  // Get stats
  const { data: statsData } = await supabaseAdmin
    .from("user_gamification_stats")
    .select("messages_sent, meetings_scheduled, connections_made, explore_passes, longest_daily_streak, longest_weekly_streak")
    .eq("user_id", userId)
    .single();

  const stats = (statsData as StatsRow) || {
    messages_sent: 0,
    meetings_scheduled: 0,
    connections_made: 0,
    explore_passes: 0,
    longest_daily_streak: 0,
    longest_weekly_streak: 0,
  };

  // Get existing badges
  const existingBadges = await getUserBadges(userId);

  const progressMap: Record<BadgeType, number> = {
    conversation_starter: stats.messages_sent,
    super_connector: stats.connections_made,
    meeting_master: stats.meetings_scheduled,
    networking_streak: stats.longest_daily_streak,
    weekly_warrior: stats.longest_weekly_streak,
    thoughtful_curator: stats.explore_passes ?? 0,
  };

  const badgeInfo: Record<BadgeType, { name: string; description: string; icon: string }> = {
    conversation_starter: {
      name: "Conversation Starter",
      description: "Send messages to start meaningful conversations",
      icon: "MessageCircle",
    },
    super_connector: {
      name: "Super Connector",
      description: "Build your network by making connections",
      icon: "Users",
    },
    meeting_master: {
      name: "Meeting Master",
      description: "Schedule meetings to deepen relationships",
      icon: "Calendar",
    },
    networking_streak: {
      name: "Networking Streak",
      description: "Stay consistent with daily engagement",
      icon: "Flame",
    },
    weekly_warrior: {
      name: "Weekly Warrior",
      description: "Hit your weekly networking goals",
      icon: "Trophy",
    },
    thoughtful_curator: {
      name: "Thoughtful Curator",
      description: "Pass on profiles to stay focused on great fits",
      icon: "Filter",
    },
  };

  const result: BadgeProgress[] = [];

  for (const [type, progress] of Object.entries(progressMap)) {
    const badgeType = type as BadgeType;
    const requirements = BADGE_REQUIREMENTS[badgeType];
    const info = badgeInfo[badgeType];
    
    const earnedBadges = existingBadges.filter(b => b.badgeType === badgeType);
    let currentTier: BadgeTier | null = null;
    
    if (earnedBadges.some(b => b.tier === "gold")) currentTier = "gold";
    else if (earnedBadges.some(b => b.tier === "silver")) currentTier = "silver";
    else if (earnedBadges.some(b => b.tier === "bronze")) currentTier = "bronze";

    const nextTier = getNextTier(currentTier);
    const nextRequirement = nextTier ? requirements[nextTier] : null;
    
    let percentToNext = 0;
    if (nextRequirement) {
      const prevRequirement = currentTier ? requirements[currentTier] : 0;
      const progressInTier = progress - prevRequirement;
      const tierRange = nextRequirement - prevRequirement;
      percentToNext = Math.min(100, Math.floor((progressInTier / tierRange) * 100));
    } else {
      percentToNext = 100; // At max tier
    }

    result.push({
      type: badgeType,
      name: info.name,
      description: info.description,
      icon: info.icon,
      currentTier,
      nextTier,
      currentProgress: progress,
      nextRequirement,
      percentToNext,
    });
  }

  return result;
}
