import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { isSafeGalleryImageUrl } from "@/lib/gallery/safe-image-url";
import type { CommunityGalleryTheme } from "@/types/gallery";

const PRIVATE_CACHE = { "Cache-Control": "private, no-store, max-age=0" };

const METHODOLOGY =
  "Among active attendees: percent who added a gallery photo labeled with this activity. Photos cluster when the saved tag matches (same spelling after normalization).";

/** Max distinct activity themes returned (sorted by popularity). Rest are still in the database. */
const MAX_GALLERY_THEMES = 200;

/**
 * Denominator: active attendees (`user_profiles.is_active`).
 * Numerator per tag: distinct active users with at least one labeled `user_photos` row.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401, headers: PRIVATE_CACHE }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: true,
          data: {
            denominator: 0,
            methodology: METHODOLOGY,
            themes: [] as CommunityGalleryTheme[],
            totalLabeledPhotos: 0,
          },
        },
        { headers: PRIVATE_CACHE }
      );
    }

    const { count: denomCount, error: denomError } = await supabaseAdmin
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (denomError) {
      console.error("Gallery community denom error:", denomError);
      return NextResponse.json(
        { success: false, error: "Failed to load gallery stats" },
        { status: 500, headers: PRIVATE_CACHE }
      );
    }

    const denominator = denomCount ?? 0;

    if (denominator === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            denominator: 0,
            methodology: METHODOLOGY,
            themes: [],
            totalLabeledPhotos: 0,
          },
        },
        { headers: PRIVATE_CACHE }
      );
    }

    const { data: profiles, error: profError } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("is_active", true);

    if (profError) {
      console.error("Gallery community profiles error:", profError);
      return NextResponse.json(
        { success: false, error: "Failed to load profiles" },
        { status: 500, headers: PRIVATE_CACHE }
      );
    }

    /** PostgREST often caps at ~1000 rows; paginate so 300+ users × several photos each stay complete. */
    const pageSize = 1000;
    const photos: {
      user_id: string;
      url: string | null;
      activity_tag: string | null;
    }[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data: batch, error: photoError } = await supabaseAdmin
        .from("user_photos")
        .select("user_id, url, activity_tag")
        .not("activity_tag", "is", null)
        .range(from, from + pageSize - 1);

      if (photoError) {
        console.error("Gallery community photos error:", photoError);
        return NextResponse.json(
          { success: false, error: "Failed to load photos" },
          { status: 500, headers: PRIVATE_CACHE }
        );
      }
      if (!batch?.length) break;
      photos.push(...batch);
      if (batch.length < pageSize) break;
    }

    const profileIdSet = new Set((profiles ?? []).map((p) => p.id as string));

    let totalLabeledPhotos = 0;
    for (const row of photos) {
      const uid = row.user_id as string | undefined;
      const tag = (row.activity_tag as string)?.trim().toLowerCase();
      const url = row.url as string | null;
      if (!uid || !tag || !profileIdSet.has(uid)) continue;
      if (!url || !isSafeGalleryImageUrl(url)) continue;
      totalLabeledPhotos++;
    }

    /** tag (lowercase) -> user ids in cohort who uploaded at least one labeled photo */
    const tagToUserIds = new Map<string, Set<string>>();
    for (const row of photos) {
      const uid = row.user_id as string | undefined;
      const tag = (row.activity_tag as string)?.trim().toLowerCase();
      if (!uid || !tag || !profileIdSet.has(uid)) continue;
      if (!tagToUserIds.has(tag)) tagToUserIds.set(tag, new Set());
      tagToUserIds.get(tag)!.add(uid);
    }

    const scored: CommunityGalleryTheme[] = [];
    for (const [tag, userIds] of tagToUserIds) {
      const count = userIds.size;
      const percent = Math.round((count / denominator) * 1000) / 10;

      const samplePhotos = photos
        .filter((p) => {
          const uid = p.user_id as string;
          const rowTag = (p.activity_tag as string)?.trim().toLowerCase();
          const url = p.url as string | null;
          return (
            rowTag === tag &&
            !!url &&
            isSafeGalleryImageUrl(url) &&
            profileIdSet.has(uid)
          );
        })
        .slice(0, 36)
        .map((p) => ({
          url: p.url as string,
          userId: p.user_id as string,
        }));

      scored.push({ tag, count, percent, samplePhotos });
    }

    scored.sort((a, b) => b.count - a.count);
    const themes = scored.slice(0, MAX_GALLERY_THEMES);

    return NextResponse.json(
      {
        success: true,
        data: {
          denominator,
          methodology: METHODOLOGY,
          themes,
          totalLabeledPhotos,
        },
      },
      { headers: PRIVATE_CACHE }
    );
  } catch (e) {
    console.error("Gallery community error:", e);
    return NextResponse.json(
      { success: false, error: "Unexpected error" },
      { status: 500, headers: PRIVATE_CACHE }
    );
  }
}
