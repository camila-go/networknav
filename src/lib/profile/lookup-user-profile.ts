import { supabaseAdmin } from "@/lib/supabase/client";

/** Row shape from `user_profiles` (subset used by profile + team). */
export type UserProfileLookupRow = {
  id: string;
  email: string;
  name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  photo_url: string | null;
  bio: string | null;
};

const SELECT =
  "id, email, name, title, company, location, photo_url, bio" as const;

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
    if (data) return data as UserProfileLookupRow;
  }

  const { data: byName } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("name", raw)
    .maybeSingle();
  if (byName) return byName as UserProfileLookupRow;

  if (raw.includes(".")) {
    const nameWithSpaces = raw.replace(/\./g, " ");
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select(SELECT)
      .ilike("name", nameWithSpaces)
      .maybeSingle();
    if (data) return data as UserProfileLookupRow;
  }

  const { data: byEmailPrefix } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("email", `${raw}@%`)
    .maybeSingle();
  if (byEmailPrefix) return byEmailPrefix as UserProfileLookupRow;

  // e.g. handle "APOTTER16" matching apotter16@tenant.com
  const { data: byEmailContains } = await supabaseAdmin
    .from("user_profiles")
    .select(SELECT)
    .ilike("email", `%${raw}%`)
    .limit(1)
    .maybeSingle();
  if (byEmailContains) return byEmailContains as UserProfileLookupRow;

  const normalized = raw.replace(/[._]/g, " ").replace(/\s+/g, " ").trim();
  if (normalized.length >= 3 && normalized !== raw) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select(SELECT)
      .ilike("name", `%${normalized}%`)
      .limit(1)
      .maybeSingle();
    if (data) return data as UserProfileLookupRow;
  }

  return null;
}
