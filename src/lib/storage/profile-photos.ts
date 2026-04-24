import { supabaseAdmin } from "@/lib/supabase/client";

export const PROFILE_PHOTOS_BUCKET = "profile-photos";

export function avatarStorageKey(userId: string): string {
  return `${userId}/avatar`;
}

export function galleryStorageKey(userId: string, photoId: string): string {
  return `${userId}/gallery/${photoId}`;
}

/**
 * Hard-delete one or more objects from the profile-photos bucket.
 * No-op when Supabase isn't configured (local/test); errors are logged but never thrown
 * so that DB row cleanup can still proceed.
 */
export async function deleteProfilePhotoObjects(
  storageKeys: string[]
): Promise<void> {
  if (!supabaseAdmin || storageKeys.length === 0) return;
  const { error } = await supabaseAdmin.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .remove(storageKeys);
  if (error) {
    console.error("Failed to delete profile-photos objects:", storageKeys, error);
  }
}
