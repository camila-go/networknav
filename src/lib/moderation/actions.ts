import { supabaseAdmin } from "@/lib/supabase/client";
import { deleteProfilePhotoObjects } from "@/lib/storage/profile-photos";
import type { ModerationContentType, ModerationStatus } from "@/types";

type ModerationDecision = Extract<
  ModerationStatus,
  "approved" | "rejected" | "deleted"
>;

/**
 * Apply a moderation decision to the underlying gallery photo (`user_photos`).
 *
 * `approved` flips `user_photos.status` to `approved` so the photo appears in
 * the community gallery. `rejected` / `deleted` remove the row and storage object.
 */
export async function applyModerationDecision(opts: {
  contentType: ModerationContentType;
  contentId: string;
  userId: string;
  decision: ModerationDecision;
  reviewerId: string;
}): Promise<void> {
  if (!supabaseAdmin) return;

  const { contentId, decision, reviewerId } = opts;
  const now = new Date().toISOString();

  if (decision === "approved") {
    await supabaseAdmin
      .from("user_photos")
      .update({
        status: "approved",
        reviewed_by: reviewerId,
        reviewed_at: now,
      })
      .eq("id", contentId);
    return;
  }

  // Reject / delete: pull the storage key first so we can hard-delete the object.
  const { data: photo } = await supabaseAdmin
    .from("user_photos")
    .select("storage_key")
    .eq("id", contentId)
    .maybeSingle();

  const key = (photo as { storage_key?: string } | null)?.storage_key;
  if (key) {
    await deleteProfilePhotoObjects([key]);
  }

  await supabaseAdmin.from("user_photos").delete().eq("id", contentId);
}
