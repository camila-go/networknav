import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { ModerationReason } from "@/types";

/**
 * Add a gallery photo to the moderation queue (`content_type` = `photo`).
 */
export async function addToModerationQueue(opts: {
  contentId: string;
  userId: string;
  contentSnapshot?: string;
  imageUrl?: string;
  reason: ModerationReason;
  reportId?: string;
}): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) {
    console.warn("Cannot add to moderation queue — Supabase not configured");
    return;
  }

  const { error } = await supabaseAdmin.from("moderation_queue" as never).insert({
    content_type: "photo",
    content_id: opts.contentId,
    user_id: opts.userId,
    content_snapshot: opts.contentSnapshot || null,
    image_url: opts.imageUrl || null,
    reason: opts.reason,
    report_id: opts.reportId || null,
    status: "pending",
  } as never);

  if (error) {
    console.error("Failed to add to moderation queue:", error);
    throw new Error(`moderation_queue insert failed: ${error.message}`);
  }
}
