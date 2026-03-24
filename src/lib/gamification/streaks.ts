import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { StreakStatus, UserStreak } from "@/types";

// Constants
export const MAX_DAILY_STREAK = 30;
const DEFAULT_WEEKLY_GOAL = 25; // More attainable default
const DAYS_IN_WEEK = 7;

// Get user's custom weekly goal
async function getUserWeeklyGoal(userId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return DEFAULT_WEEKLY_GOAL;
  }

  const { data } = await supabaseAdmin
    .from("user_gamification_stats")
    .select("weekly_goal")
    .eq("user_id", userId)
    .single();

  return data?.weekly_goal ?? DEFAULT_WEEKLY_GOAL;
}

// ============================================
// Supabase Row Types
// ============================================

interface StreakRow {
  id: string;
  user_id: string;
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  week_start_date: string | null;
  points_this_week: number;
  streak_frozen_until: string | null;
  freezes_used_this_week: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// Helper Functions
// ============================================

function mapRowToStreak(row: StreakRow): UserStreak {
  return {
    id: row.id,
    userId: row.user_id,
    streakType: row.streak_type as "daily" | "weekly",
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
    weekStartDate: row.week_start_date,
    pointsThisWeek: row.points_this_week,
    streakFrozenUntil: row.streak_frozen_until,
    freezesUsedThisWeek: row.freezes_used_this_week,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysBetween(date1: Date, date2: Date): number {
  const d1 = getStartOfDay(date1);
  const d2 = getStartOfDay(date2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function hoursBetween(date1: Date, date2: Date): number {
  return (date2.getTime() - date1.getTime()) / (1000 * 60 * 60);
}

// ============================================
// Get User Streaks
// ============================================

async function getUserStreaks(userId: string): Promise<{ daily: UserStreak | null; weekly: UserStreak | null }> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return { daily: null, weekly: null };
  }

  const { data, error } = await supabaseAdmin
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("[Streaks] Error fetching streaks:", error);
    return { daily: null, weekly: null };
  }

  const rows = (data || []) as StreakRow[];
  const daily = rows.find(r => r.streak_type === "daily");
  const weekly = rows.find(r => r.streak_type === "weekly");

  return {
    daily: daily ? mapRowToStreak(daily) : null,
    weekly: weekly ? mapRowToStreak(weekly) : null,
  };
}

// ============================================
// Calculate Streak Status
// ============================================

export async function calculateStreakStatus(userId: string): Promise<StreakStatus> {
  const [{ daily, weekly }, weeklyGoal] = await Promise.all([
    getUserStreaks(userId),
    getUserWeeklyGoal(userId),
  ]);
  const now = new Date();
  const today = getStartOfDay(now);
  const weekStart = getStartOfWeek(now);

  // Always calculate points this week from activity table (even if no streak record exists)
  let calculatedPointsThisWeek = 0;
  if (isSupabaseConfigured && supabaseAdmin) {
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const { data: activityData } = await supabaseAdmin
      .from("user_activity")
      .select("points_earned")
      .eq("user_id", userId)
      .gte("created_at", weekStartStr);
    
    calculatedPointsThisWeek = (activityData || []).reduce(
      (sum: number, row: { points_earned: number }) => sum + (row.points_earned || 0),
      0
    );
  }

  // Calculate daily streak status
  // Check for recent activity even if no streak record
  let lastActivityDate: string | null = null;
  let hasActivityToday = false;
  
  if (isSupabaseConfigured && supabaseAdmin) {
    const todayStr = today.toISOString().split("T")[0];
    const { data: recentActivity } = await supabaseAdmin
      .from("user_activity")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (recentActivity && recentActivity.length > 0) {
      lastActivityDate = recentActivity[0].created_at;
      const activityDay = new Date(lastActivityDate).toISOString().split("T")[0];
      hasActivityToday = activityDay === todayStr;
    }
  }

  let dailyStatus: StreakStatus["daily"] = {
    current: 0,
    longest: 0,
    lastActivity: lastActivityDate,
    isActive: hasActivityToday,
    hoursUntilExpiry: null,
    freezeAvailable: true,
  };

  if (daily) {
    const lastActivity = daily.lastActivityDate ? new Date(daily.lastActivityDate) : null;
    const daysSinceActivity = lastActivity ? daysBetween(lastActivity, today) : Infinity;
    
    // Check if streak is frozen
    const isFrozen = daily.streakFrozenUntil && new Date(daily.streakFrozenUntil) > now;
    
    // Streak is active if activity was today or yesterday (or frozen)
    const isActive = daysSinceActivity <= 1 || isFrozen || hasActivityToday;
    
    // Calculate hours until expiry (end of today + 24 hours from last activity)
    let hoursUntilExpiry: number | null = null;
    if (isActive && lastActivity && !isFrozen) {
      const expiryTime = new Date(lastActivity);
      expiryTime.setUTCDate(expiryTime.getUTCDate() + 2); // 48 hours from last activity
      expiryTime.setUTCHours(0, 0, 0, 0);
      hoursUntilExpiry = Math.max(0, hoursBetween(now, expiryTime));
    }

    dailyStatus = {
      current: isActive
        ? Math.min(MAX_DAILY_STREAK, daily.currentStreak)
        : hasActivityToday
          ? 1
          : 0,
      longest: Math.min(MAX_DAILY_STREAK, daily.longestStreak),
      lastActivity: daily.lastActivityDate || lastActivityDate,
      isActive,
      hoursUntilExpiry,
      freezeAvailable: daily.freezesUsedThisWeek < 1,
    };
  } else if (hasActivityToday) {
    // No streak record but activity today - count as day 1
    dailyStatus = {
      current: 1,
      longest: 1,
      lastActivity: lastActivityDate,
      isActive: true,
      hoursUntilExpiry: 48,
      freezeAvailable: true,
    };
  }

  // Calculate weekly streak status
  // Calculate days until Monday reset
  const nextMonday = new Date(weekStart);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  const daysUntilReset = Math.ceil((nextMonday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Use calculated points from activity table as primary source
  const pointsThisWeek = calculatedPointsThisWeek;
  
  // Calculate if on track (need to meet goal by end of week)
  const daysIntoWeek = DAYS_IN_WEEK - daysUntilReset;
  const expectedPoints = Math.floor((weeklyGoal / DAYS_IN_WEEK) * daysIntoWeek);
  const isOnTrack = pointsThisWeek >= expectedPoints || pointsThisWeek >= weeklyGoal;

  let weeklyStatus: StreakStatus["weekly"] = {
    current: weekly?.currentStreak || 0,
    longest: weekly?.longestStreak || 0,
    pointsThisWeek,
    pointsRequired: weeklyGoal,
    daysUntilReset,
    isOnTrack,
  };

  return {
    daily: dailyStatus,
    weekly: weeklyStatus,
  };
}

// ============================================
// Update Streaks (called after activity)
// ============================================

export async function updateStreaks(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  const now = new Date();
  const today = getStartOfDay(now).toISOString().split("T")[0];
  const weekStart = getStartOfWeek(now).toISOString().split("T")[0];

  // Get current streaks
  const { daily, weekly } = await getUserStreaks(userId);

  // Update daily streak
  await updateDailyStreak(userId, daily, today);

  // Update weekly streak
  await updateWeeklyStreak(userId, weekly, weekStart);
}

async function updateDailyStreak(
  userId: string,
  existing: UserStreak | null,
  today: string
): Promise<void> {
  if (!supabaseAdmin) return;

  if (!existing) {
    // Create new daily streak
    await supabaseAdmin.from("user_streaks").insert({
      user_id: userId,
      streak_type: "daily",
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
    });
    return;
  }

  const lastActivity = existing.lastActivityDate;
  const todayDate = new Date(today);
  const lastDate = lastActivity ? new Date(lastActivity) : null;

  let newStreak = existing.currentStreak;
  
  if (!lastDate) {
    // First activity ever
    newStreak = 1;
  } else {
    const daysDiff = daysBetween(lastDate, todayDate);
    
    if (daysDiff === 0) {
      const clampedCurrent = Math.min(MAX_DAILY_STREAK, existing.currentStreak);
      const clampedLongest = Math.min(MAX_DAILY_STREAK, existing.longestStreak);
      if (clampedCurrent !== existing.currentStreak || clampedLongest !== existing.longestStreak) {
        await supabaseAdmin
          .from("user_streaks")
          .update({
            current_streak: clampedCurrent,
            longest_streak: clampedLongest,
          })
          .eq("id", existing.id);
        await supabaseAdmin
          .from("user_gamification_stats")
          .update({
            current_daily_streak: clampedCurrent,
            longest_daily_streak: clampedLongest,
          })
          .eq("user_id", userId);
      }
      return;
    } else if (daysDiff === 1) {
      // Consecutive day, increment streak
      newStreak = existing.currentStreak + 1;
    } else {
      // Streak broken (unless frozen)
      const isFrozen = existing.streakFrozenUntil && new Date(existing.streakFrozenUntil) > todayDate;
      if (!isFrozen) {
        newStreak = 1;
      }
    }
  }

  newStreak = Math.min(MAX_DAILY_STREAK, newStreak);
  const newLongest = Math.min(
    MAX_DAILY_STREAK,
    Math.max(newStreak, existing.longestStreak)
  );

  await supabaseAdmin
    .from("user_streaks")
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    })
    .eq("id", existing.id);

  // Also update the stats table
  await supabaseAdmin
    .from("user_gamification_stats")
    .update({
      current_daily_streak: newStreak,
      longest_daily_streak: newLongest,
    })
    .eq("user_id", userId);
}

async function updateWeeklyStreak(
  userId: string,
  existing: UserStreak | null,
  weekStart: string
): Promise<void> {
  if (!supabaseAdmin) return;

  // Get user's weekly goal
  const weeklyGoal = await getUserWeeklyGoal(userId);

  // Get points earned this week
  const { data: activityData } = await supabaseAdmin
    .from("user_activity")
    .select("points_earned")
    .eq("user_id", userId)
    .gte("created_at", weekStart);

  const pointsThisWeek = (activityData || []).reduce(
    (sum, row) => sum + (row.points_earned || 0),
    0
  );

  if (!existing) {
    // Create new weekly streak
    const metGoal = pointsThisWeek >= weeklyGoal;
    await supabaseAdmin.from("user_streaks").insert({
      user_id: userId,
      streak_type: "weekly",
      current_streak: metGoal ? 1 : 0,
      longest_streak: metGoal ? 1 : 0,
      week_start_date: weekStart,
      points_this_week: pointsThisWeek,
    });
    return;
  }

  const existingWeekStart = existing.weekStartDate;
  const isNewWeek = existingWeekStart !== weekStart;

  if (isNewWeek) {
    // Check if previous week's goal was met (use previous goal - stored points vs goal at time)
    const previousMetGoal = existing.pointsThisWeek >= weeklyGoal;
    const newStreak = previousMetGoal ? existing.currentStreak + 1 : 0;
    const newLongest = Math.max(newStreak, existing.longestStreak);

    await supabaseAdmin
      .from("user_streaks")
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        week_start_date: weekStart,
        points_this_week: pointsThisWeek,
        freezes_used_this_week: 0, // Reset freezes for new week
      })
      .eq("id", existing.id);

    // Update stats
    await supabaseAdmin
      .from("user_gamification_stats")
      .update({
        current_weekly_streak: newStreak,
        longest_weekly_streak: newLongest,
        points_this_week: pointsThisWeek,
      })
      .eq("user_id", userId);
  } else {
    // Same week, just update points
    await supabaseAdmin
      .from("user_streaks")
      .update({
        points_this_week: pointsThisWeek,
      })
      .eq("id", existing.id);

    await supabaseAdmin
      .from("user_gamification_stats")
      .update({
        points_this_week: pointsThisWeek,
      })
      .eq("user_id", userId);
  }
}

// ============================================
// Freeze Streak (grace period)
// ============================================

export async function freezeStreak(userId: string): Promise<{ success: boolean; message: string }> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return { success: false, message: "Database not configured" };
  }

  const { daily } = await getUserStreaks(userId);

  if (!daily) {
    return { success: false, message: "No active streak to freeze" };
  }

  if (daily.freezesUsedThisWeek >= 1) {
    return { success: false, message: "You've already used your weekly freeze" };
  }

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(23, 59, 59, 999);

  await supabaseAdmin
    .from("user_streaks")
    .update({
      streak_frozen_until: tomorrow.toISOString(),
      freezes_used_this_week: daily.freezesUsedThisWeek + 1,
    })
    .eq("id", daily.id);

  return { success: true, message: "Streak frozen until tomorrow" };
}
