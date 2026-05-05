/**
 * Lisa Lucas — canonical Supabase profile id and public avatar URL (CAPS / Jynx).
 * Used so About, legacy `/user/team-lisa-lucas` links, and lookups resolve to the same person.
 */

export const LISA_LUCAS_PLACEHOLDER_ROUTE_ID = "team-lisa-lucas";

/** `user_profiles.id` for Lisa in production Supabase. */
export const LISA_LUCAS_USER_PROFILE_ID =
  "035b0cb2-a5f6-43d9-8b1f-6d5b2ddd9beb";

/** Public Storage object `{LISA_LUCAS_USER_PROFILE_ID}/avatar` (fallback if `photo_url` is empty). */
export const LISA_LUCAS_AVATAR_PUBLIC_URL =
  "https://bvxbnxaiixkvnogbxhzq.supabase.co/storage/v1/object/public/profile-photos/035b0cb2-a5f6-43d9-8b1f-6d5b2ddd9beb/avatar";

/** Map legacy About / demo route id to the real profile id for DB lookups. */
export function canonicalIdForProfileLookup(routeOrId: string): string {
  if (routeOrId === LISA_LUCAS_PLACEHOLDER_ROUTE_ID) {
    return LISA_LUCAS_USER_PROFILE_ID;
  }
  return routeOrId;
}
