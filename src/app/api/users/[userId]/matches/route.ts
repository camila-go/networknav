import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { userMatches, users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { isLiveDatabaseMode } from "@/lib/supabase/data-mode";
import { ensureMatchesLoaded } from "@/lib/network/ensure-matches-loaded";
import { cookies } from "next/headers";

interface UserMatchSummary {
  id: string;
  name: string;
  title: string;
  company?: string;
  matchType: "high-affinity" | "strategic";
  photoUrl?: string;
}

// Demo connections for users without stored matches
const DEMO_CONNECTIONS = [
  { id: "demo-sarah", name: "Sarah Chen", title: "VP of Engineering", company: "TechCorp", matchType: "high-affinity" as const },
  { id: "demo-marcus", name: "Marcus Johnson", title: "Chief People Officer", company: "GrowthStartup", matchType: "strategic" as const },
  { id: "demo-elena", name: "Elena Rodriguez", title: "Founder & CEO", company: "InnovateCo", matchType: "high-affinity" as const },
  { id: "demo-david", name: "David Park", title: "VP of Product", company: "ScaleUp Inc", matchType: "strategic" as const },
  { id: "demo-aisha", name: "Aisha Patel", title: "CTO", company: "FinanceFlow", matchType: "high-affinity" as const },
  { id: "demo-james", name: "James Wilson", title: "Director of Operations", company: "LogiTech Solutions", matchType: "strategic" as const },
  { id: "demo-lisa", name: "Lisa Thompson", title: "Senior Manager", company: "BrandCo", matchType: "high-affinity" as const },
  { id: "demo-michael", name: "Michael Brown", title: "SVP Sales", company: "EnterpriseNow", matchType: "strategic" as const },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;
    
    // Allow authenticated users and demo users
    if (!session && !deviceId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const targetUserId = params.userId;
    let publicMatches: UserMatchSummary[] = [];

    if (!isLiveDatabaseMode()) {
      const storedMatches = userMatches.get(targetUserId) || [];
      if (storedMatches.length > 0) {
        publicMatches = storedMatches
          .filter((m) => !m.passed)
          .map((match) => ({
            id: match.matchedUserId,
            name: match.matchedUser.profile.name,
            title: match.matchedUser.profile.title,
            company: match.matchedUser.profile.company,
            matchType: match.type,
            photoUrl: match.matchedUser.profile.photoUrl,
          }));
      }
    }

    /** Live DB: same pool as Matches — suggested connections you have not Passed on (not chat attempts). */
    if (
      publicMatches.length === 0 &&
      isLiveDatabaseMode() &&
      supabaseAdmin
    ) {
      try {
        let targetEmail: string | undefined =
          session?.userId === targetUserId ? session.email : undefined;
        if (!targetEmail) {
          // Try by ID first, then by name, then by email prefix
          let { data: row } = await supabaseAdmin
            .from("user_profiles")
            .select("email, id")
            .eq("id", targetUserId)
            .maybeSingle();
          
          // If not found by ID, try by name
          if (!row) {
            const nameResult = await supabaseAdmin
              .from("user_profiles")
              .select("email, id")
              .ilike("name", targetUserId)
              .maybeSingle();
            if (nameResult.data) {
              row = nameResult.data;
            }
          }
          
          // If not found by name, try with spaces instead of periods
          if (!row && targetUserId.includes('.')) {
            const nameWithSpaces = targetUserId.replace(/\./g, ' ');
            const nameResult = await supabaseAdmin
              .from("user_profiles")
              .select("email, id")
              .ilike("name", nameWithSpaces)
              .maybeSingle();
            if (nameResult.data) {
              row = nameResult.data;
            }
          }
          
          // If still not found, try by email prefix
          if (!row) {
            const emailResult = await supabaseAdmin
              .from("user_profiles")
              .select("email, id")
              .ilike("email", `${targetUserId}@%`)
              .maybeSingle();
            if (emailResult.data) {
              row = emailResult.data;
            }
          }
          
          const em = (row as { email?: string } | null)?.email;
          if (typeof em === "string" && em.trim()) {
            targetEmail = em.trim();
          }
        }
        const loaded = await ensureMatchesLoaded(targetUserId, targetEmail);
        publicMatches = loaded
          .filter((m) => !m.passed)
          .map((match) => ({
            id: match.matchedUserId,
            name: match.matchedUser.profile.name,
            title: match.matchedUser.profile.title,
            company: match.matchedUser.profile.company,
            matchType: match.type,
            photoUrl: match.matchedUser.profile.photoUrl,
          }));
      } catch (err) {
        console.error("Live matches load for profile connections:", err);
      }
    }

    /* Demo / non-live only: placeholder attendees when no in-memory matches. */
    if (
      publicMatches.length === 0 &&
      isSupabaseConfigured &&
      supabaseAdmin &&
      !isLiveDatabaseMode()
    ) {
      try {
        const { data: supabaseUsers } = await supabaseAdmin
          .from("user_profiles")
          .select("id, name, title, company, photo_url")
          .eq("is_active", true)
          .neq("id", targetUserId)
          .limit(12);

        if (supabaseUsers && supabaseUsers.length > 0) {
          publicMatches = supabaseUsers.map((user, index) => ({
            id: user.id,
            name: user.name || "User",
            title: user.title || "Professional",
            company: user.company || undefined,
            matchType: index % 2 === 0 ? ("high-affinity" as const) : ("strategic" as const),
            photoUrl: user.photo_url || undefined,
          }));
        }
      } catch (err) {
        console.error("Supabase fetch error:", err);
      }
    }

    if (publicMatches.length === 0 && !isLiveDatabaseMode()) {
      const allUsers = Array.from(users.values()).filter((u) => u.id !== targetUserId);
      if (allUsers.length > 0) {
        publicMatches = allUsers.slice(0, 10).map((user, index) => ({
          id: user.id,
          name: user.name,
          title: user.title || "Professional",
          company: user.company || undefined,
          matchType: index % 2 === 0 ? ("high-affinity" as const) : ("strategic" as const),
          photoUrl: user.photoUrl || undefined,
        }));
      }
    }

    if (publicMatches.length === 0 && !isLiveDatabaseMode()) {
      const seed = targetUserId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const shuffled = [...DEMO_CONNECTIONS].sort((a, b) => {
        const aHash = (a.id.charCodeAt(0) + seed) % 100;
        const bHash = (b.id.charCodeAt(0) + seed) % 100;
        return aHash - bHash;
      });
      publicMatches = shuffled.slice(0, 5 + (seed % 4));
    }

    // Get target user's name
    let targetUserName = "User";
    for (const user of users.values()) {
      if (user.id === targetUserId) {
        targetUserName = user.name;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        userName: targetUserName,
        matches: publicMatches,
        totalCount: publicMatches.length,
        highAffinityCount: publicMatches.filter(m => m.matchType === "high-affinity").length,
        strategicCount: publicMatches.filter(m => m.matchType === "strategic").length,
      },
    });
  } catch (error) {
    console.error("Get user matches error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
