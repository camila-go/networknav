import { supabaseAdmin } from "@/lib/supabase/client";
import { enrichProfileRowsWithResolvedPhotoUrl } from "@/lib/profile/profile-photo-url";
import { canonicalIdForProfileLookup } from "@/lib/team/lisa-lucas";
import { resolvedProfilePhotoUrlForRow } from "@/lib/team/canonical-avatar-fallback";

/** Row shape from `user_profiles` (subset used by profile + team). */
export type UserProfileLookupRow = {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  photo_url: string | null;
  bio: string | null;
};

const SELECT =
  "id, user_id, email, name, title, company, location, photo_url, bio" as const;

/** Merge avatar URL from sibling `user_profiles` rows (same auth user / split rows). */
async function withResolvedPhoto(
  row: UserProfileLookupRow
): Promise<UserProfileLookupRow> {
  if (!supabaseAdmin) return row;
  const [enriched] = await enrichProfileRowsWithResolvedPhotoUrl(supabaseAdmin, [
    row,
  ]);
  let out = (enriched as UserProfileLookupRow) ?? row;
  const resolved = resolvedProfilePhotoUrlForRow(out.id, out.photo_url);
  const prev = (out.photo_url ?? "").trim();
  if (resolved !== prev) {
    out = { ...out, photo_url: resolved ? resolved : null };
  }
  return out;
}

/**
 * Resolve a user from `user_profiles` by id, display name, or email local-part
 * patterns (used by /user/[userId] and About team links).
 */
export async function lookupUserProfileByIdentifier(
  identifier: string
): Promise<UserProfileLookupRow | null> {
  if (!supabaseAdmin) return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  const lookupKey = canonicalIdForProfileLookup(trimmed);

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      lookupKey
    );

  if (isUuid) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select(SELECT)
      .eq("id", lookupKey)
      .maybeSingle();
    if (data) return withResolvedPhoto(data as UserProfileLookupRow);
  }

  const { data: byName } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("name", lookupKey)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byName) return withResolvedPhoto(byName as UserProfileLookupRow);

  if (lookupKey.includes(".")) {
    const nameWithSpaces = lookupKey.replace(/\./g, " ");
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select(SELECT)
      .ilike("name", nameWithSpaces)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return withResolvedPhoto(data as UserProfileLookupRow);
  }

  // Substring match on the raw key (catches "Austin Potter" -> "Austin J. Potter",
  // "Potter, Austin", etc.). Skipped for very short keys to avoid false positives.
  if (lookupKey.length >= 4) {
    const { data: byNameContains } = await supabaseAdmin
      .from("user_profiles")
      .select(SELECT)
      .ilike("name", `%${lookupKey}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byNameContains) {
      return withResolvedPhoto(byNameContains as UserProfileLookupRow);
    }
  }

  const { data: byEmailPrefix } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("email", `${lookupKey}@%`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byEmailPrefix) return withResolvedPhoto(byEmailPrefix as UserProfileLookupRow);

  // e.g. handle "APOTTER16" matching apotter16@tenant.com
  const { data: byEmailContains } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("email", `%${lookupKey}%`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byEmailContains) {
    return withResolvedPhoto(byEmailContains as UserProfileLookupRow);
  }

  const normalized = lookupKey.replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
  if (normalized.length >= 3 && normalized !== lookupKey) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select(SELECT)
      .ilike("name", `%${normalized}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return withResolvedPhoto(data as UserProfileLookupRow);
  }

  return null;
}
