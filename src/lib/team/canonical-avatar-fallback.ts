import {
  LISA_LUCAS_AVATAR_PUBLIC_URL,
  LISA_LUCAS_USER_PROFILE_ID,
} from "@/lib/team/lisa-lucas";
import {
  CAMILA_GONZALEZ_AVATAR_PUBLIC_URL,
  CAMILA_GONZALEZ_USER_PROFILE_ID,
} from "@/lib/team/camila-gonzalez";

/**
 * Prefer non-empty `photo_url`; otherwise return a stable public URL for known team
 * profiles (About + own profile when DB row is missing the URL).
 */
export function resolvedProfilePhotoUrlForRow(
  profileId: string,
  photoUrl: string | null | undefined
): string {
  const own = (photoUrl ?? "").trim();
  if (own) return own;
  if (profileId === LISA_LUCAS_USER_PROFILE_ID) return LISA_LUCAS_AVATAR_PUBLIC_URL;
  if (profileId === CAMILA_GONZALEZ_USER_PROFILE_ID)
    return CAMILA_GONZALEZ_AVATAR_PUBLIC_URL;
  return "";
}
