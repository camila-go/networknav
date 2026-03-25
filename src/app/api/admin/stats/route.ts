import { NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export async function GET() {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  try {
    let totalUsers = users.size;
    let pendingModeration = 0;
    let reportsThisWeek = 0;
    let activeUsers = totalUsers;

    if (isSupabaseConfigured && supabaseAdmin) {
      // Total users
      const { count: userCount } = await supabaseAdmin
        .from("user_profiles")
        .select("*", { count: "exact", head: true });
      if (userCount !== null) totalUsers = userCount;

      // Pending moderation
      const { count: modCount } = await supabaseAdmin
        .from("moderation_queue" as never)
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (modCount !== null) pendingModeration = modCount;

      // Reports this week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: reportCount } = await supabaseAdmin
        .from("reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo);
      if (reportCount !== null) reportsThisWeek = reportCount;

      // Active users (logged in within last 7 days, approximated by updated_at)
      const { count: activeCount } = await supabaseAdmin
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .gte("updated_at", weekAgo)
        .eq("is_active", true);
      if (activeCount !== null) activeUsers = activeCount;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        pendingModeration,
        reportsThisWeek,
        activeUsers,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
