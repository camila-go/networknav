import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { applyModerationDecision } from "@/lib/moderation/actions";
import { z } from "zod";
import type { ModerationQueueRow } from "@/types/database";

const bulkSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum(["approved", "rejected", "deleted"]),
});

const GALLERY_PHOTO_LABEL = "gallery photo";

// PATCH /api/admin/moderation/bulk — bulk update moderation items
export async function PATCH(request: NextRequest) {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const result = bulkSchema.safeParse(body);
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

    const { itemIds, status } = result.data;

    const { data: rawItems } = await supabaseAdmin
      .from("moderation_queue" as never)
      .select("id, content_type, content_id, user_id")
      .in("id", itemIds);

    const items = (rawItems || []) as unknown as Pick<
      ModerationQueueRow,
      "id" | "content_type" | "content_id" | "user_id"
    >[];

    // Apply decision + send per-item notifications (same semantics as single PATCH).
    for (const item of items) {
      await applyModerationDecision({
        contentType: item.content_type,
        contentId: item.content_id,
        userId: item.user_id,
        decision: status,
        reviewerId: session.userId,
      });

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
          body: `Your ${label} was removed. Please ensure your content follows community guidelines.`,
          data: { contentType: item.content_type, contentId: item.content_id },
        } as never);
      } else if (status === "approved") {
        await supabaseAdmin.from("notifications").insert({
          user_id: item.user_id,
          type: "content_approved",
          title: "Photo Approved",
          body: "Your gallery photo was approved and is now visible to the community.",
          data: { contentType: item.content_type, contentId: item.content_id },
        } as never);
      }
    }

    const { error } = await supabaseAdmin
      .from("moderation_queue" as never)
      .update({
        status,
        reviewed_by: session.userId,
        reviewed_at: new Date().toISOString(),
      } as never)
      .in("id", itemIds);

    if (error) throw error;

    return NextResponse.json({ success: true, data: { updated: itemIds.length } });
  } catch (error) {
    console.error("Admin bulk moderation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update moderation items" },
      { status: 500 }
    );
  }
}
