import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { moderateContent } from "@/lib/security/contentModeration";
import type { ModerationContentType, ModerationReason } from "@/types";

/**
 * Auto-moderate content and add to moderation queue if flagged.
 * Non-blocking — does not prevent content from being created.
 */
export async function autoModerateContent(opts: {
  contentType: ModerationContentType;
  contentId: string;
  userId: string;
  text: string;
  imageUrl?: string;
}): Promise<void> {
  try {
    const result = await moderateContent(opts.text);
    if (result.flagged) {
      await addToModerationQueue({
        contentType: opts.contentType,
        contentId: opts.contentId,
        userId: opts.userId,
        contentSnapshot: opts.text,
        imageUrl: opts.imageUrl,
        reason: "auto_flagged",
      });
    }
  } catch (error) {
    console.error("Auto-moderation error (non-blocking):", error);
  }
}

/**
 * Add an item to the moderation queue.
 */
export async function addToModerationQueue(opts: {
  contentType: ModerationContentType;
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
    content_type: opts.contentType,
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
