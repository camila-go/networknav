import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserBadges, getBadgeProgress } from "@/lib/gamification/badges";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

// Helper to resolve userId - looks up by ID, then by name, then by email prefix
async function resolveUserId(userId: string): Promise<string> {
  if (!isSupabaseConfigured || !supabaseAdmin) return userId;
  
  // First check if it's a valid ID
  const { data: byId } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  
  if (byId?.id) return byId.id;
  
  // Try by name (case-insensitive)
  const { data: byName } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .ilike("name", userId)
    .maybeSingle();
  
  if (byName?.id) return byName.id;
  
  // Try with spaces instead of periods
  if (userId.includes('.')) {
    const nameWithSpaces = userId.replace(/\./g, ' ');
    const { data: byNameSpaces } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .ilike("name", nameWithSpaces)
      .maybeSingle();
    
    if (byNameSpaces?.id) return byNameSpaces.id;
  }
  
  // Try by email prefix
  const { data: byEmail } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .ilike("email", `${userId}@%`)
    .maybeSingle();
  
  if (byEmail?.id) return byEmail.id;
  
  return userId;
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
