import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { z } from "zod";
import type { ModerationQueueRow } from "@/types/database";

// GET /api/admin/moderation — list moderation queue
export async function GET(request: NextRequest) {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));
    const status = searchParams.get("status") || "pending";
    if (!isSupabaseConfigured || !supabaseAdmin) {
      return NextResponse.json({
        success: true,
        data: { items: [], total: 0, page, pageSize, hasMore: false },
      });
    }

    let query = supabaseAdmin
      .from("moderation_queue" as never)
      .select(
        "id, content_type, content_id, user_id, content_snapshot, image_url, reason, report_id, status, reviewed_by, reviewed_at, reviewer_notes, created_at",
        { count: "exact" }
      );

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    query = query.eq("content_type", "photo");

    const { data: rawData, count, error } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;

    const data = (rawData || []) as unknown as ModerationQueueRow[];

    // Fetch user names for the items
    const userIds = [...new Set(data.map((item) => item.user_id))];
    let userMap: Record<string, { name: string; photo_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("user_profiles")
        .select("id, name, photo_url")
        .in("id", userIds);
      if (profiles) {
        const typedProfiles = profiles as unknown as Array<{ id: string; name: string; photo_url: string | null }>;
        userMap = Object.fromEntries(
          typedProfiles.map((p) => [p.id, { name: p.name, photo_url: p.photo_url }])
        );
      }
    }

    const items = data.map((item) => ({
      id: item.id,
      contentType: item.content_type,
      contentId: item.content_id,
      userId: item.user_id,
      userName: userMap[item.user_id]?.name || "Unknown",
      userPhotoUrl: userMap[item.user_id]?.photo_url || undefined,
      contentSnapshot: item.content_snapshot || "",
      imageUrl: item.image_url || undefined,
      reason: item.reason,
      reportId: item.report_id || undefined,
      status: item.status,
      reviewedBy: item.reviewed_by || undefined,
      reviewedAt: item.reviewed_at || undefined,
      reviewerNotes: item.reviewer_notes || undefined,
      createdAt: item.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: count || 0,
        page,
        pageSize,
        hasMore: (count || 0) > page * pageSize,
      },
    });
  } catch (error) {
    console.error("Admin moderation list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch moderation queue" },
      { status: 500 }
    );
  }
}

// POST /api/admin/moderation — manually add a gallery photo to the queue
const addItemSchema = z.object({
  contentId: z.string().uuid(),
  userId: z.string().uuid(),
  contentSnapshot: z.string().optional(),
  imageUrl: z.string().optional(),
  reason: z.literal("manual_review"),
});

export async function POST(request: NextRequest) {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const result = addItemSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { error } = await supabaseAdmin.from("moderation_queue" as never).insert({
      content_type: "photo",
      content_id: result.data.contentId,
      user_id: result.data.userId,
      content_snapshot: result.data.contentSnapshot || null,
      image_url: result.data.imageUrl || null,
      reason: "manual_review",
      status: "pending",
    } as never);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Admin moderation add error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add moderation item" },
      { status: 500 }
    );
  }
}
