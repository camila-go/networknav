import { getUserById } from "@/lib/stores/users-store";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export type AuthorInfo = {
  name: string;
  email: string | null;
  /** Public profile photo URL when available */
  photoUrl: string | null;
};

/**
 * Resolve display names for post/reply user_ids.
 * The in-memory users Map is keyed by email; JWT stores user UUID — so we match by StoredUser.id
 * and fall back to Supabase user_profiles.
 */
export async function resolveExploreAuthors(
  userIds: string[]
): Promise<Map<string, AuthorInfo>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, AuthorInfo>();
  const missing: string[] = [];

  for (const id of unique) {
    const u = getUserById(id);
    if (u) {
      map.set(id, {
        name: u.name || "User",
        email: u.email,
        photoUrl: u.photoUrl?.trim() || null,
      });
    } else {
      missing.push(id);
    }
  }

  if (missing.length > 0 && isSupabaseConfigured && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("id, name, email, photo_url")
      .in("id", missing);

    for (const row of data || []) {
      const r = row as {
        id: string;
        name?: string;
        email?: string;
        photo_url?: string | null;
      };
      map.set(r.id, {
        name: r.name?.trim() || "User",
        email: r.email ?? null,
        photoUrl: r.photo_url?.trim() || null,
      });
    }
  }

  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, {
        name: "Member",
        email: null,
        photoUrl: null,
      });
    }
  }

  return map;
}
