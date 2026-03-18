import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  ActivityType,
  UserActivity,
  GamificationStats,
  ActivitySummary,
} from "@/types";
import { calculateStreakStatus, updateStreaks } from "@/lib/gamification/streaks";
import { checkAndAwardBadges, getUserBadges } from "@/lib/gamification/badges";
import { getEncouragementMessage } from "@/lib/gamification/encouragement";

// Point values for each activity type
const POINTS: Record<ActivityType, number> = {
  message_sent: 5,
  meeting_scheduled: 25,
  connection_made: 15,
  intro_requested: 10,
  explore_pass: 2,
};

// ============================================
// Supabase Row Types
// ============================================

interface ActivityRow {
  id: string;
  user_id: string;
  activity_type: string;
  points_earned: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface StatsRow {
  id: string;
  user_id: string;
  total_points: number;
  points_this_week: number;
  points_this_month: number;
  messages_sent: number;
  meetings_scheduled: number;
  connections_made: number;
  intros_requested: number;
  explore_passes?: number;
  current_daily_streak: number;
  current_weekly_streak: number;
  longest_daily_streak: number;
  longest_weekly_streak: number;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Helper Functions
// ============================================

function mapRowToActivity(row: ActivityRow): UserActivity {
  return {
    id: row.id,
    userId: row.user_id,
    activityType: row.activity_type as ActivityType,
    pointsEarned: row.points_earned,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
  };
}

function mapRowToStats(row: StatsRow): GamificationStats {
  return {
    id: row.id,
    userId: row.user_id,
    totalPoints: row.total_points,
    pointsThisWeek: row.points_this_week,
    pointsThisMonth: row.points_this_month,
    messagesSent: row.messages_sent,
    meetingsScheduled: row.meetings_scheduled,
    connectionsMade: row.connections_made,
    introsRequested: row.intros_requested,
    explorePasses: row.explore_passes ?? 0,
    currentDailyStreak: row.current_daily_streak,
    currentWeeklyStreak: row.current_weekly_streak,
    longestDailyStreak: row.longest_daily_streak,
    longestWeeklyStreak: row.longest_weekly_streak,
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

async function getOrCreateStats(userId: string): Promise<GamificationStats> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    return createEmptyStats(userId);
  }

  const { data, error } = await supabaseAdmin
    .from("user_gamification_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Activity API] Error fetching stats:", error);
  }

  if (data) {
    return mapRowToStats(data as StatsRow);
  }

  // Create new stats record
  const { data: newData, error: insertError } = await supabaseAdmin
    .from("user_gamification_stats")
    .insert({ user_id: userId })
    .select()
    .single();

  if (insertError) {
    console.error("[Activity API] Error creating stats:", insertError);
    return createEmptyStats(userId);
  }

  return mapRowToStats(newData as StatsRow);
}

function createEmptyStats(userId: string): GamificationStats {
  return {
    id: "",
    userId,
    totalPoints: 0,
    pointsThisWeek: 0,
    pointsThisMonth: 0,
    messagesSent: 0,
    meetingsScheduled: 0,
    connectionsMade: 0,
    introsRequested: 0,
    explorePasses: 0,
    currentDailyStreak: 0,
    currentWeeklyStreak: 0,
    longestDailyStreak: 0,
    longestWeeklyStreak: 0,
    lastActiveAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function getRecentActivity(userId: string, limit = 10): Promise<UserActivity[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("user_activity")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Activity API] Error fetching recent activity:", error);
    return [];
  }

  return (data as ActivityRow[]).map(mapRowToActivity);
}

async function logActivity(
  userId: string,
  activityType: ActivityType,
  metadata?: Record<string, unknown>
): Promise<UserActivity | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;

  const points = POINTS[activityType];

  // Insert activity record
  const { data: activityData, error: activityError } = await supabaseAdmin
    .from("user_activity")
    .insert({
      user_id: userId,
      activity_type: activityType,
      points_earned: points,
      metadata: metadata || {},
    })
    .select()
    .single();

  if (activityError) {
    console.error("[Activity API] Error logging activity:", activityError);
    return null;
  }

  const now = new Date();

  if (activityType === "explore_pass") {
    const { data: existingStats } = await supabaseAdmin
      .from("user_gamification_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    const prevPasses = (existingStats as StatsRow | null)?.explore_passes ?? 0;

    if (existingStats) {
      await supabaseAdmin
        .from("user_gamification_stats")
        .update({
          total_points: ((existingStats as StatsRow).total_points || 0) + points,
          points_this_week: ((existingStats as StatsRow).points_this_week || 0) + points,
          points_this_month: ((existingStats as StatsRow).points_this_month || 0) + points,
          explore_passes: prevPasses + 1,
          last_active_at: now.toISOString(),
        })
        .eq("user_id", userId);
    } else {
      await supabaseAdmin.from("user_gamification_stats").insert({
        user_id: userId,
        total_points: points,
        points_this_week: points,
        points_this_month: points,
        explore_passes: 1,
        last_active_at: now.toISOString(),
      });
    }
  } else {
    const statField = getStatFieldForActivity(activityType);
    const { error: statsError } = await supabaseAdmin.rpc("increment_gamification_stats", {
      p_user_id: userId,
      p_points: points,
      p_stat_field: statField,
      p_last_active: now.toISOString(),
    });

    if (statsError) {
      const { data: existingStats } = await supabaseAdmin
        .from("user_gamification_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (existingStats) {
        const row = existingStats as StatsRow;
        const fieldKey = statField as keyof StatsRow;
        const prev = Number(row[fieldKey] ?? 0);
        await supabaseAdmin
          .from("user_gamification_stats")
          .update({
            total_points: (row.total_points || 0) + points,
            points_this_week: (row.points_this_week || 0) + points,
            points_this_month: (row.points_this_month || 0) + points,
            [statField]: prev + 1,
            last_active_at: now.toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await supabaseAdmin.from("user_gamification_stats").insert({
          user_id: userId,
          total_points: points,
          points_this_week: points,
          points_this_month: points,
          [statField]: 1,
          last_active_at: now.toISOString(),
        });
      }
    }
  }

  await updateStreaks(userId);
  await checkAndAwardBadges(userId, activityType);

  return mapRowToActivity(activityData as ActivityRow);
}

function getStatFieldForActivity(activityType: ActivityType): string {
  switch (activityType) {
    case "message_sent":
      return "messages_sent";
    case "meeting_scheduled":
      return "meetings_scheduled";
    case "connection_made":
      return "connections_made";
    case "intro_requested":
      return "intros_requested";
    case "explore_pass":
      return "explore_passes";
    default:
      return "messages_sent";
  }
}

// ============================================
// GET - Fetch activity summary
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const deviceId = request.cookies.get("device_id")?.value;
    
    // Allow demo users if no session
    const currentUserId = session?.userId || deviceId;
    
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    
    // If no targetUserId and no currentUserId, return unauthorized
    if (!targetUserId && !currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = targetUserId || currentUserId || "demo";
    const isOwnProfile = !targetUserId || targetUserId === currentUserId;

    // Check if Supabase is configured
    if (!isSupabaseConfigured || !supabaseAdmin) {
      // Return empty stats with a note that Supabase needs to be configured
      return NextResponse.json({
        stats: createEmptyStats(userId),
        streaks: {
          daily: { current: 0, longest: 0, isActive: false, hoursUntilExpiry: null, lastActivityDate: null },
          weekly: { current: 0, longest: 0, isActive: false, pointsThisWeek: 0, pointsRequired: 25 },
        },
        badges: [],
        recentActivity: [],
        encouragement: {
          type: "welcome" as const,
          title: "Welcome to Connection Points!",
          message: "Start networking to earn points, build streaks, and unlock badges.",
          icon: "sparkles" as const,
        },
        setupRequired: !isSupabaseConfigured,
      });
    }

    // If viewing another user's profile, return their public stats
    if (!isOwnProfile) {
      const [stats, badges] = await Promise.all([
        getOrCreateStats(userId),
        getUserBadges(userId),
      ]);

      // Generate demo stats if no real stats exist
      let publicStats = {
        totalPoints: stats.totalPoints,
        messagesSent: stats.messagesSent,
        connectionsMade: stats.connectionsMade,
        meetingsScheduled: stats.meetingsScheduled,
        currentDailyStreak: stats.currentDailyStreak,
        lastActiveAt: stats.lastActiveAt,
      };

      // If stats are empty, generate deterministic demo stats based on userId
      if (publicStats.totalPoints === 0 && publicStats.messagesSent === 0) {
        const seed = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const daysActive = (seed % 30) + 5;
        publicStats = {
          totalPoints: 50 + (seed % 500),
          messagesSent: 10 + (seed % 50),
          connectionsMade: 3 + (seed % 15),
          meetingsScheduled: seed % 8,
          currentDailyStreak: seed % 10,
          lastActiveAt: new Date(Date.now() - (seed % 7) * 24 * 60 * 60 * 1000),
        };
      }

      // Return only public activity data for other users
      return NextResponse.json({
        stats: publicStats,
        badges,
        isPublicView: true,
      });
    }

    // Get full summary for own data
    const [stats, streaks, badges, recentActivity] = await Promise.all([
      getOrCreateStats(userId),
      calculateStreakStatus(userId),
      getUserBadges(userId),
      getRecentActivity(userId),
    ]);

    const encouragement = await getEncouragementMessage(userId, stats, streaks);

    const summary: ActivitySummary = {
      stats,
      streaks,
      badges,
      recentActivity,
      encouragement,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Activity API] GET error:", error);
    // Return fallback data on error instead of failing
    return NextResponse.json({
      stats: createEmptyStats(""),
      streaks: {
        daily: { current: 0, longest: 0, isActive: false, hoursUntilExpiry: null, lastActivityDate: null },
        weekly: { current: 0, longest: 0, isActive: false, pointsThisWeek: 0, pointsRequired: 50 },
      },
      badges: [],
      recentActivity: [],
      encouragement: null,
    });
  }
}

// ============================================
// POST - Log new activity
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { activityType, metadata } = body as {
      activityType: ActivityType;
      metadata?: Record<string, unknown>;
    };

    if (!activityType) {
      return NextResponse.json(
        { error: "Activity type is required" },
        { status: 400 }
      );
    }

    const validTypes: ActivityType[] = [
      "message_sent",
      "meeting_scheduled",
      "connection_made",
      "intro_requested",
      "explore_pass",
    ];

    if (!validTypes.includes(activityType)) {
      return NextResponse.json(
        { error: "Invalid activity type" },
        { status: 400 }
      );
    }

    const activity = await logActivity(session.userId, activityType, metadata);

    if (!activity) {
      return NextResponse.json(
        { error: "Failed to log activity" },
        { status: 500 }
      );
    }

    // Get updated stats to return
    const stats = await getOrCreateStats(session.userId);

    return NextResponse.json({
      activity,
      stats,
      pointsEarned: POINTS[activityType],
    });
  } catch (error) {
    console.error("[Activity API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to log activity" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - Update user settings (weekly goal)
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSupabaseConfigured || !supabaseAdmin) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { weeklyGoal } = body as { weeklyGoal?: number };

    if (weeklyGoal === undefined) {
      return NextResponse.json({ error: "weeklyGoal is required" }, { status: 400 });
    }

    // Validate weekly goal (min 10, max 200)
    const goalOptions = [10, 15, 25, 35, 50, 75, 100];
    if (!goalOptions.includes(weeklyGoal)) {
      return NextResponse.json(
        { error: "Invalid weekly goal. Choose from: " + goalOptions.join(", ") },
        { status: 400 }
      );
    }

    // Update user's weekly goal
    const { error } = await supabaseAdmin
      .from("user_gamification_stats")
      .update({ weekly_goal: weeklyGoal })
      .eq("user_id", session.userId);

    if (error) {
      // If no row exists, create one
      await supabaseAdmin
        .from("user_gamification_stats")
        .upsert({
          user_id: session.userId,
          weekly_goal: weeklyGoal,
        }, { onConflict: "user_id" });
    }

    return NextResponse.json({
      success: true,
      weeklyGoal,
    });
  } catch (error) {
    console.error("[Activity API] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
