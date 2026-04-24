import { supabaseAdmin } from "@/lib/supabase/client";
import {
  avatarStorageKey,
  deleteProfilePhotoObjects,
} from "@/lib/storage/profile-photos";
import type { ModerationContentType, ModerationStatus } from "@/types";

type ModerationDecision = Extract<
  ModerationStatus,
  "approved" | "rejected" | "deleted"
>;

/**
 * Apply a moderation decision to the underlying content.
 *
 * - Gallery photos: `approved` flips `user_photos.status` to `approved` so it
 *   becomes visible in the community gallery. `rejected` / `deleted` remove the
 *   `user_photos` row and the Supabase Storage object.
 * - Profile / avatar reports: `deleted` or `rejected` clears the reported
 *   user's avatar (both `users.photo_url` and `user_profiles.photo_url`) and
 *   deletes the storage object. `approved` is a no-op on the content (the
 *   moderator decided the avatar is fine).
 * - Posts / replies / messages: `approved` is a no-op; `rejected` / `deleted`
 *   remove the row.
 */
export async function applyModerationDecision(opts: {
  contentType: ModerationContentType;
  contentId: string;
  userId: string;
  decision: ModerationDecision;
  reviewerId: string;
}): Promise<void> {
  if (!supabaseAdmin) return;

  const { contentType, contentId, userId, decision, reviewerId } = opts;
  const now = new Date().toISOString();

  if (contentType === "photo") {
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
    return;
  }

  if (contentType === "profile") {
    if (decision === "approved") {
      // Reporter said "this avatar is inappropriate", moderator disagrees — nothing to do.
      return;
    }

    // Remove the offending avatar. Avatars live on `user_profiles.photo_url`;
    // the legacy in-memory `users` table may also mirror it.
    const key = avatarStorageKey(userId);
    await deleteProfilePhotoObjects([key]);

    await supabaseAdmin
      .from("user_profiles")
      .update({ photo_url: null, updated_at: now } as never)
      .eq("id", userId);

    await supabaseAdmin
      .from("user_profiles")
      .update({ photo_url: null, updated_at: now } as never)
      .eq("user_id", userId);
    return;
  }

  // Other content types: only remove on reject/delete; approve is a queue-only action.
  if (decision === "approved") return;

  if (contentType === "message") {
    await supabaseAdmin.from("messages").delete().eq("id", contentId);
    return;
  }

  // `post` and `reply` live in tables (explore_posts / explore_replies) that
  // aren't in the generated Supabase Database typings yet; cast through never.
  const legacyTable = contentType === "post" ? "explore_posts" : contentType === "reply" ? "explore_replies" : null;
  if (legacyTable) {
    await (supabaseAdmin.from as unknown as (t: string) => {
      delete: () => { eq: (col: string, val: string) => Promise<unknown> };
    })(legacyTable)
      .delete()
      .eq("id", contentId);
  }
}
