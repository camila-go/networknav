import type { SupabaseClient } from "@supabase/supabase-js";

/** Minimal row shape for resolving a displayable avatar URL across duplicate profile rows. */
export type ProfilePhotoSource = {
  id: string;
  user_id?: string | null;
  photo_url?: string | null;
};

/**
 * Some tenants store `user_profiles` twice (e.g. `id` = auth user vs `id` = profile UUID)
 * with avatar updates touching only one row. Sync the public URL to every row keyed by
 * auth id on either `id` or `user_id`.
 */
export async function syncUserProfilePhotoUrlAcrossRows(
  supabase: SupabaseClient,
  authUserId: string,
  photoUrl: string | null
): Promise<void> {
  const now = new Date().toISOString();
  const payload = { photo_url: photoUrl, updated_at: now };
  await supabase.from("user_profiles").update(payload).eq("user_id", authUserId);
  await supabase.from("user_profiles").update(payload).eq("id", authUserId);
}

function trimUrl(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/**
 * For each profile, prefer its own `photo_url`; otherwise reuse a non-empty URL from any
 * cohort row that shares the same `user_id` or `id` (covers split rows after partial updates).
 */
export async function enrichProfileRowsWithResolvedPhotoUrl<
  T extends ProfilePhotoSource,
>(supabase: SupabaseClient, profiles: T[]): Promise<T[]> {
  if (profiles.length === 0) return profiles;

  const idSet = new Set<string>();
  const userIdSet = new Set<string>();
  for (const p of profiles) {
    idSet.add(p.id);
    const uid = p.user_id?.trim();
    if (uid) userIdSet.add(uid);
  }

  const idList = [...idSet];
  const userIdList = [...userIdSet];
  if (idList.length === 0) return profiles;

  const CHUNK = 120;
  const rows: ProfilePhotoSource[] = [];
  const pushRows = (data: ProfilePhotoSource[] | null) => {
    if (!data?.length) return;
    rows.push(...data);
  };

  for (let i = 0; i < idList.length; i += CHUNK) {
    const idChunk = idList.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, user_id, photo_url")
      .in("id", idChunk)
      .not("photo_url", "is", null);
    if (error) console.warn("enrichProfileRowsWithResolvedPhotoUrl (id):", error.message);
    else pushRows(data as ProfilePhotoSource[]);
  }

  const userIdListArr = [...userIdList];
  for (let i = 0; i < userIdListArr.length; i += CHUNK) {
    const uidChunk = userIdListArr.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, user_id, photo_url")
      .in("user_id", uidChunk)
      .not("photo_url", "is", null);
    if (error) console.warn("enrichProfileRowsWithResolvedPhotoUrl (user_id):", error.message);
    else pushRows(data as ProfilePhotoSource[]);
  }

  if (rows.length === 0) {
    return profiles;
  }

  const urlByUserId = new Map<string, string>();
  const urlByProfileId = new Map<string, string>();
  for (const row of rows) {
    const u = trimUrl(row.photo_url);
    if (!u) continue;
    urlByProfileId.set(row.id, u);
    const uid = row.user_id?.trim();
    if (uid) urlByUserId.set(uid, u);
  }

  function resolvePhoto(p: ProfilePhotoSource): string | undefined {
    const own = trimUrl(p.photo_url);
    if (own) return own;
    const uid = p.user_id?.trim();
    if (uid && urlByUserId.has(uid)) return urlByUserId.get(uid);
    if (urlByProfileId.has(p.id)) return urlByProfileId.get(p.id);
    if (urlByUserId.has(p.id)) return urlByUserId.get(p.id);
    return undefined;
  }

  return profiles.map((p) => {
    const resolved = resolvePhoto(p);
    if (resolved === trimUrl(p.photo_url)) return p;
    return { ...p, photo_url: resolved ?? p.photo_url };
  });
}
