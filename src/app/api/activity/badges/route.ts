import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserBadges, getBadgeProgress } from "@/lib/gamification/badges";
import { cookies } from "next/headers";
import type { UserBadge } from "@/types";

// Demo badges for users without stored badges
function generateDemoBadges(userId: string): UserBadge[] {
  // Use userId to create deterministic but varied badges
  const seed = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const demoBadges: UserBadge[] = [];
  const now = new Date();
  
  // Conversation Starter badge (most common)
  if (seed % 3 !== 0) {
    demoBadges.push({
      id: `demo-badge-1-${userId}`,
      badgeType: "conversation_starter",
      tier: seed % 5 === 0 ? "gold" : seed % 3 === 0 ? "silver" : "bronze",
      earnedAt: new Date(now.getTime() - (seed % 30) * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - (seed % 7) * 24 * 60 * 60 * 1000),
    });
  }
  
  // Networking Streak badge
  if (seed % 4 !== 0) {
    demoBadges.push({
      id: `demo-badge-2-${userId}`,
      badgeType: "networking_streak",
      tier: seed % 7 === 0 ? "gold" : seed % 2 === 0 ? "silver" : "bronze",
      earnedAt: new Date(now.getTime() - (seed % 20) * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - (seed % 5) * 24 * 60 * 60 * 1000),
    });
  }
  
  // Super Connector badge (less common)
  if (seed % 5 === 0) {
    demoBadges.push({
      id: `demo-badge-3-${userId}`,
      badgeType: "super_connector",
      tier: seed % 10 === 0 ? "gold" : "silver",
      earnedAt: new Date(now.getTime() - (seed % 15) * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - (seed % 3) * 24 * 60 * 60 * 1000),
    });
  }
  
  // Weekly Warrior badge
  if (seed % 6 !== 0) {
    demoBadges.push({
      id: `demo-badge-4-${userId}`,
      badgeType: "weekly_warrior",
      tier: seed % 8 === 0 ? "gold" : seed % 4 === 0 ? "silver" : "bronze",
      earnedAt: new Date(now.getTime() - (seed % 10) * 24 * 60 * 60 * 1000),
      updatedAt: new Date(now.getTime() - (seed % 2) * 24 * 60 * 60 * 1000),
    });
  }

  return demoBadges;
}

// ============================================
// GET - Get user badges
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;
    
    // Allow demo users
    if (!session && !deviceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const targetUserId = searchParams.get("userId");
    const includeProgress = searchParams.get("progress") === "true";

    // Determine which user's badges to fetch
    const currentUserId = session?.userId || deviceId || "demo";
    const userId = targetUserId || currentUserId;
    const isOwnProfile = userId === currentUserId;

    // Get badges from database
    let badges = await getUserBadges(userId);

    // If no badges and viewing another user, generate demo badges
    if (badges.length === 0 && targetUserId && !isOwnProfile) {
      badges = generateDemoBadges(targetUserId);
    }

    // If requesting own badges and want progress, include it
    if (isOwnProfile && includeProgress) {
      const progress = await getBadgeProgress(userId);
      return NextResponse.json({
        badges,
        progress,
        isOwnProfile: true,
      });
    }

    // For other users, only return earned badges (public view)
    return NextResponse.json({
      badges,
      isOwnProfile,
    });
  } catch (error) {
    console.error("[Badges API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}
