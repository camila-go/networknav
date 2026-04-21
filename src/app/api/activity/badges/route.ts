import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserBadges, getBadgeProgress } from "@/lib/gamification/badges";
import { cookies } from "next/headers";
import { lookupUserProfileByIdentifier } from "@/lib/profile/lookup-user-profile";

async function resolveUserId(userId: string): Promise<string> {
  const row = await lookupUserProfileByIdentifier(userId);
  return row?.id ?? userId;
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
    let userId = targetUserId || currentUserId;
    
    // Resolve userId if it's a name
    if (targetUserId) {
      userId = await resolveUserId(targetUserId);
    }
    
    const isOwnProfile = userId === currentUserId;

    // Earned tiers only from Supabase — no fabricated badges for other users
    const badges = await getUserBadges(userId);

    // If requesting own badges and want progress, include it
    if (isOwnProfile && includeProgress) {
      const progress = await getBadgeProgress(userId);
      return NextResponse.json({
        success: true,
        badges,
        progress,
        isOwnProfile: true,
      });
    }

    // For other users, only return earned badges (public view)
    return NextResponse.json({
      success: true,
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
