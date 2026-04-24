import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import {
  buildThemesForDenominator,
  type PhotoRow,
} from "@/lib/gallery/build-community-themes";
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
    const photos: PhotoRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data: batch, error: photoError } = await supabaseAdmin
        .from("user_photos")
        .select("user_id, url, activity_tag")
        .eq("status", "approved")
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

    const { themes: built, totalLabeledPhotos } = buildThemesForDenominator(
      photos,
      profileIdSet,
      denominator
    );
    const themes = built.slice(0, MAX_GALLERY_THEMES);

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
