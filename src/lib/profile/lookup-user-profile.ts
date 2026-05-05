import { supabaseAdmin } from "@/lib/supabase/client";
import { enrichProfileRowsWithResolvedPhotoUrl } from "@/lib/profile/profile-photo-url";

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
  return (enriched as UserProfileLookupRow) ?? row;
}

/**
 * Resolve a user from `user_profiles` by id, display name, or email local-part
 * patterns (used by /user/[userId] and About team links).
 */
export async function lookupUserProfileByIdentifier(
  identifier: string
): Promise<UserProfileLookupRow | null> {
  if (!supabaseAdmin) return null;
  const raw = identifier.trim();
  if (!raw) return null;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      raw
    );

  if (isUuid) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select(SELECT)
      .eq("id", raw)
      .maybeSingle();
    if (data) return withResolvedPhoto(data as UserProfileLookupRow);
  }

  const { data: byName } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("name", raw)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byName) return withResolvedPhoto(byName as UserProfileLookupRow);

  if (raw.includes(".")) {
    const nameWithSpaces = raw.replace(/\./g, " ");
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select(SELECT)
      .ilike("name", nameWithSpaces)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return withResolvedPhoto(data as UserProfileLookupRow);
  }

  const { data: byEmailPrefix } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("email", `${raw}@%`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byEmailPrefix) return withResolvedPhoto(byEmailPrefix as UserProfileLookupRow);

  // e.g. handle "APOTTER16" matching apotter16@tenant.com
  const { data: byEmailContains } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("email", `%${raw}%`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (byEmailContains) {
    return withResolvedPhoto(byEmailContains as UserProfileLookupRow);
  }

  const normalized = raw.replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
  if (normalized.length >= 3 && normalized !== raw) {
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
