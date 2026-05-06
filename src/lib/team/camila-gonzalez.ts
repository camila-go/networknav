/**
 * Camila Gonzalez — canonical Supabase profile id and public avatar URL (CAPS / Jynx).
 * Used so About, profile views, and lookups match the same person when `photo_url` is empty
 * (split rows, failed sync, or a newer duplicate row without a photo).
 */

/** `user_profiles.id` for Camila in production Supabase. */
export const CAMILA_GONZALEZ_USER_PROFILE_ID =
  "7bec4114-86ec-4222-bed3-5a25b8fa3dd6";

/**
 * Public Storage object for Camila’s headshot (fallback if `photo_url` is empty).
 * Prefer the live `photo_url` from the DB when set; update this if the object is rotated
 * and the row is ever cleared without a replacement URL.
 */
export const CAMILA_GONZALEZ_AVATAR_PUBLIC_URL =
  "https://bvxbnxaiixkvnogbxhzq.supabase.co/storage/v1/object/public/profile-photos/7bec4114-86ec-4222-bed3-5a25b8fa3dd6/avatar-1778090718172.png";
