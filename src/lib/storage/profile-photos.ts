import { supabaseAdmin } from "@/lib/supabase/client";

export const PROFILE_PHOTOS_BUCKET = "profile-photos";

/** Legacy fixed-name key. Kept for back-compat with rows that still point here. */
export function avatarStorageKey(userId: string): string {
  return `${userId}/avatar`;
}

/** Map a MIME type to a storage extension. Defaults to `jpg` for unknown types. */
export function avatarExtensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

/**
 * Versioned avatar key: `${userId}/avatar-${timestamp}.${ext}`. Each upload writes to a
 * fresh key so a partial / failed upload never destroys the previously good image.
 */
export function buildVersionedAvatarKey(
  userId: string,
  fileType: string,
  timestamp: number = Date.now()
): string {
  const ext = avatarExtensionFromMime(fileType);
  return `${userId}/avatar-${timestamp}.${ext}`;
}

/** True if `key` is any avatar object owned by `userId` (legacy or versioned). */
export function isAvatarKeyForUser(userId: string, key: string): boolean {
  if (!key.startsWith(`${userId}/`)) return false;
  const tail = key.slice(userId.length + 1);
  return tail === "avatar" || /^avatar(-[^/]+)?(\.[a-z0-9]+)?$/.test(tail);
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

/**
 * Lists `${userId}/` and returns every storage key that looks like an avatar variant
 * (legacy `avatar` or versioned `avatar-{ts}.{ext}`). Gallery objects (`gallery/...`) are
 * excluded.
 */
export async function listUserAvatarObjects(userId: string): Promise<string[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .list(userId, { limit: 100 });
  if (error) {
    console.error("listUserAvatarObjects error:", userId, error);
    return [];
  }
  return (data ?? [])
    .map((entry) => `${userId}/${entry.name}`)
    .filter((key) => isAvatarKeyForUser(userId, key));
}

/**
 * Removes every avatar object owned by `userId`, optionally keeping `keepKey` (the just
 * uploaded file). Errors are logged, never thrown — orphan cleanup is best-effort.
 */
export async function deleteUserAvatarObjects(
  userId: string,
  keepKey?: string
): Promise<void> {
  const all = await listUserAvatarObjects(userId);
  const toDelete = keepKey ? all.filter((k) => k !== keepKey) : all;
  if (toDelete.length === 0) return;
  await deleteProfilePhotoObjects(toDelete);
}
