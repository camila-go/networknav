import { NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/supabase/client";
import {
  buildThemesForDenominator,
  distinctUsersWithLabeledPhoto,
  labeledPhotoCountsByTag,
  type PhotoRow,
} from "@/lib/gallery/build-community-themes";
import type { ProjectorThemeRow } from "@/types/gallery";

const PRIVATE_CACHE = { "Cache-Control": "private, no-store, max-age=0" };

const METHODOLOGY_ACTIVE =
  "Active cohort: profiles with is_active. Percent = share of active attendees who labeled a gallery photo with this activity.";
const METHODOLOGY_NETWORK =
  "Full network: all registered profiles in user_profiles. Percent = share of all registered users who labeled a gallery photo with this activity.";

const MAX_THEMES_RETURN = 200;

/** Paginate user_photos with non-null activity_tag. */
async function fetchAllLabeledPhotos(): Promise<PhotoRow[]> {
  const pageSize = 1000;
  const photos: PhotoRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data: batch, error } = await supabaseAdmin!
      .from("user_photos")
      .select("user_id, url, activity_tag")
      .not("activity_tag", "is", null)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!batch?.length) break;
    photos.push(
      ...(batch as { user_id: string; url: string | null; activity_tag: string | null }[])
    );
    if (batch.length < pageSize) break;
  }
  return photos;
}

function attachRanksAndPhotoCounts(
  themes: { tag: string; count: number; percent: number; samplePhotos: unknown[] }[],
  photoCounts: Map<string, number>
): ProjectorThemeRow[] {
  return themes.map((t, i) => ({
    tag: t.tag,
    rank: i + 1,
    count: t.count,
    percent: t.percent,
    labeledPhotoCount: photoCounts.get(t.tag) ?? 0,
    samplePhotos: t.samplePhotos as ProjectorThemeRow["samplePhotos"],
  }));
}

export async function GET() {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          methodologyActive: METHODOLOGY_ACTIVE,
          methodologyNetwork: METHODOLOGY_NETWORK,
          activeAttendees: {
            denominator: 0,
            totalLabeledPhotos: 0,
            usersWithLabeledPhoto: 0,
            themeCount: 0,
            themes: [] as ProjectorThemeRow[],
          },
          fullNetwork: {
            denominator: 0,
            totalLabeledPhotos: 0,
            usersWithLabeledPhoto: 0,
            themeCount: 0,
            themes: [] as ProjectorThemeRow[],
          },
        },
      },
      { headers: PRIVATE_CACHE }
    );
  }

  try {
    const photos = await fetchAllLabeledPhotos();

    const { data: activeProfiles, error: activeErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("is_active", true);

    if (activeErr) throw activeErr;

    const { data: allProfiles, error: allErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id");

    if (allErr) throw allErr;

    const activeSet = new Set((activeProfiles ?? []).map((p) => p.id as string));
    const allSet = new Set((allProfiles ?? []).map((p) => p.id as string));

    const activeDenom = activeSet.size;
    const networkDenom = allSet.size;

    const activeBuilt = buildThemesForDenominator(photos, activeSet, activeDenom);
    const networkBuilt = buildThemesForDenominator(photos, allSet, networkDenom);

    const activePhotoByTag = labeledPhotoCountsByTag(photos, activeSet);
    const networkPhotoByTag = labeledPhotoCountsByTag(photos, allSet);

    const activeThemes = attachRanksAndPhotoCounts(
      activeBuilt.themes.slice(0, MAX_THEMES_RETURN),
      activePhotoByTag
    );
    const networkThemes = attachRanksAndPhotoCounts(
      networkBuilt.themes.slice(0, MAX_THEMES_RETURN),
      networkPhotoByTag
    );

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        methodologyActive: METHODOLOGY_ACTIVE,
        methodologyNetwork: METHODOLOGY_NETWORK,
        activeAttendees: {
          denominator: activeDenom,
          totalLabeledPhotos: activeBuilt.totalLabeledPhotos,
          usersWithLabeledPhoto: distinctUsersWithLabeledPhoto(photos, activeSet),
          themeCount: activeBuilt.themes.length,
          themes: activeThemes,
        },
        fullNetwork: {
          denominator: networkDenom,
          totalLabeledPhotos: networkBuilt.totalLabeledPhotos,
          usersWithLabeledPhoto: distinctUsersWithLabeledPhoto(photos, allSet),
          themeCount: networkBuilt.themes.length,
          themes: networkThemes,
        },
      },
    }, { headers: PRIVATE_CACHE });
  } catch (e) {
    console.error("admin gallery-projector:", e);
    return NextResponse.json(
      { success: false, error: "Failed to load gallery projector data" },
      { status: 500, headers: PRIVATE_CACHE }
    );
  }
}
