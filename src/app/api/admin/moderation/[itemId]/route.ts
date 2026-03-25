import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { z } from "zod";
import type { ModerationQueueRow } from "@/types/database";

const updateSchema = z.object({
  status: z.enum(["approved", "rejected", "deleted"]),
  reviewerNotes: z.string().max(500).optional(),
});

// PATCH /api/admin/moderation/[itemId] — approve/reject/delete
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  const { itemId } = await params;

  try {
    const body = await request.json();
    const result = updateSchema.safeParse(body);
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

    const { status, reviewerNotes } = result.data;

    // Get the moderation item first
    const { data: rawItem, error: fetchError } = await supabaseAdmin
      .from("moderation_queue" as never)
      .select("*")
      .eq("id", itemId)
      .single();

    if (fetchError || !rawItem) {
      return NextResponse.json(
        { success: false, error: "Moderation item not found" },
        { status: 404 }
      );
    }

    const item = rawItem as unknown as ModerationQueueRow;

    // Update the moderation item
    const { error: updateError } = await supabaseAdmin
      .from("moderation_queue" as never)
      .update({
        status,
        reviewed_by: session.userId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewerNotes || null,
      } as never)
      .eq("id", itemId);

    if (updateError) throw updateError;

    // If deleted, remove the actual content
    if (status === "deleted") {
      await deleteContent(item.content_type, item.content_id);

      // Send notification to content author
      await supabaseAdmin.from("notifications").insert({
        user_id: item.user_id,
        type: "content_removed",
        title: "Content Removed",
        body: `Your ${item.content_type} was removed for violating community guidelines.`,
        data: { contentType: item.content_type, contentId: item.content_id },
      } as never);
    }

    // If rejected (warn), remove content and send warning
    if (status === "rejected") {
      await deleteContent(item.content_type, item.content_id);

      await supabaseAdmin.from("notifications").insert({
        user_id: item.user_id,
        type: "content_warning",
        title: "Content Warning",
        body: `Your ${item.content_type} was removed. ${reviewerNotes || "Please ensure your content follows community guidelines."}`,
        data: { contentType: item.content_type, contentId: item.content_id },
      } as never);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin moderation update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update moderation item" },
      { status: 500 }
    );
  }
}

async function deleteContent(contentType: string, contentId: string) {
  if (!supabaseAdmin) return;

  const tableMap: Record<string, string> = {
    post: "explore_posts",
    reply: "explore_replies",
    message: "messages",
    photo: "user_photos",
  };

  const table = tableMap[contentType];
  if (table) {
    await supabaseAdmin.from(table).delete().eq("id", contentId);
  }
}
