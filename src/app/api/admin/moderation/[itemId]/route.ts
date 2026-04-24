import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { applyModerationDecision } from "@/lib/moderation/actions";
import { z } from "zod";
import type { ModerationQueueRow } from "@/types/database";

const updateSchema = z.object({
  status: z.enum(["approved", "rejected", "deleted"]),
  reviewerNotes: z.string().max(500).optional(),
});

const NOTIFICATION_LABEL: Record<string, string> = {
  photo: "gallery photo",
  profile: "profile photo",
  post: "post",
  reply: "reply",
  message: "message",
};

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

    // Apply the decision to the underlying content (flip photo status, delete
    // avatar / row + storage, etc.). Runs before the queue update so a failure
    // there doesn't leave the queue row marked reviewed on unchanged content.
    await applyModerationDecision({
      contentType: item.content_type,
      contentId: item.content_id,
      userId: item.user_id,
      decision: status,
      reviewerId: session.userId,
    });

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

    // Notify the content author when we actually touched their content.
    // Approved gallery photos get a "published" ping; other approvals are silent.
    const label = NOTIFICATION_LABEL[item.content_type] ?? item.content_type;
    if (status === "deleted") {
      await supabaseAdmin.from("notifications").insert({
        user_id: item.user_id,
        type: "content_removed",
        title: "Content Removed",
        body: `Your ${label} was removed for violating community guidelines.`,
        data: { contentType: item.content_type, contentId: item.content_id },
      } as never);
    } else if (status === "rejected") {
      await supabaseAdmin.from("notifications").insert({
        user_id: item.user_id,
        type: "content_warning",
        title: "Content Warning",
        body: `Your ${label} was removed. ${reviewerNotes || "Please ensure your content follows community guidelines."}`,
        data: { contentType: item.content_type, contentId: item.content_id },
      } as never);
    } else if (status === "approved" && item.content_type === "photo") {
      await supabaseAdmin.from("notifications").insert({
        user_id: item.user_id,
        type: "content_approved",
        title: "Photo Approved",
        body: "Your gallery photo was approved and is now visible to the community.",
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
