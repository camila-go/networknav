import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { z } from "zod";
import type { ModerationQueueRow } from "@/types/database";

const bulkSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(50),
  status: z.enum(["approved", "rejected", "deleted"]),
});

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

    // For delete/reject actions, get items first so we can remove content
    if (status === "deleted" || status === "rejected") {
      const { data: rawItems } = await supabaseAdmin
        .from("moderation_queue" as never)
        .select("id, content_type, content_id, user_id")
        .in("id", itemIds);

      const items = (rawItems || []) as unknown as Pick<ModerationQueueRow, "id" | "content_type" | "content_id" | "user_id">[];

      const tableMap: Record<string, string> = {
        post: "explore_posts",
        reply: "explore_replies",
        message: "messages",
        photo: "user_photos",
      };

      for (const item of items) {
        const table = tableMap[item.content_type] as "messages" | "user_photos" | undefined;
        if (table) {
          await supabaseAdmin.from(table).delete().eq("id", item.content_id);
        }

        // Notify content authors
        await supabaseAdmin.from("notifications").insert({
          user_id: item.user_id,
          type: status === "deleted" ? "content_removed" : "content_warning",
          title: status === "deleted" ? "Content Removed" : "Content Warning",
          body: `Your ${item.content_type} was removed for violating community guidelines.`,
          data: { contentType: item.content_type, contentId: item.content_id },
        } as never);
      }
    }

    // Update all items
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
