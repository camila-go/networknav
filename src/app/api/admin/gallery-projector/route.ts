import { NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin } from "@/lib/supabase/client";
import {
  buildThemesForDenominator,
  distinctUsersWithLabeledPhoto,
  labeledPhotoCountsByTag,
  type PhotoRow,
} from "@/lib/gallery/build-community-themes";
import {
  buildThemeEnrichment,
  emptyEnrichment,
  type EnrichmentPhotoRow,
  type EnrichmentProfile,
  type EnrichmentQuestionnaire,
} from "@/lib/gallery/build-theme-enrichment";
import type { ProjectorThemeRow } from "@/types/gallery";

const PRIVATE_CACHE = { "Cache-Control": "private, no-store, max-age=0" };

const METHODOLOGY =
  "Full network: all registered profiles in user_profiles. Percent = share of all registered users who labeled a gallery photo with this activity.";

const MAX_THEMES_RETURN = 200;

type RawPhotoRow = {
  user_id: string;
  url: string | null;
  activity_tag: string | null;
  storage_key?: string | null;
  caption?: string | null;
};

/** Re-resolve public storage URLs from `storage_key` so images stay valid if URLs in DB are stale. */
function normalizePhotoUrls(rows: RawPhotoRow[]): PhotoRow[] {
  return rows.map((row) => {
    const sk = row.storage_key?.trim();
    if (sk && supabaseAdmin) {
      const { data } = supabaseAdmin.storage.from("profile-photos").getPublicUrl(sk);
      return {
        user_id: row.user_id,
        url: data.publicUrl,
        activity_tag: row.activity_tag,
      };
    }
    return {
      user_id: row.user_id,
      url: row.url,
      activity_tag: row.activity_tag,
    };
  });
}

/** Paginate user_photos with non-null activity_tag. Returns both URL-normalized rows and raw rows (for captions). */
async function fetchAllLabeledPhotos(): Promise<{
  photos: PhotoRow[];
  raw: RawPhotoRow[];
}> {
  const pageSize = 1000;
  const photos: PhotoRow[] = [];
  const raw: RawPhotoRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data: batch, error } = await supabaseAdmin!
      .from("user_photos")
      .select("user_id, url, activity_tag, storage_key, caption")
      .not("activity_tag", "is", null)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!batch?.length) break;
    const typedBatch = batch as RawPhotoRow[];
    raw.push(...typedBatch);
    photos.push(...normalizePhotoUrls(typedBatch));
    if (batch.length < pageSize) break;
  }
  return { photos, raw };
}

function attachRanksAndPhotoCounts(
  themes: { tag: string; count: number; percent: number; samplePhotos: unknown[] }[],
  photoCounts: Map<string, number>,
  enrichmentByTag: Map<string, ProjectorThemeRow["enrichment"]>
): ProjectorThemeRow[] {
  return themes.map((t, i) => ({
    tag: t.tag,
    rank: i + 1,
    count: t.count,
    percent: t.percent,
    labeledPhotoCount: photoCounts.get(t.tag) ?? 0,
    samplePhotos: t.samplePhotos as ProjectorThemeRow["samplePhotos"],
    enrichment: enrichmentByTag.get(t.tag) ?? emptyEnrichment(),
  }));
}

type RawProfileRow = {
  id: string;
  name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  questionnaire_data: Record<string, unknown> | null;
};

export async function GET() {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        success: true,
        data: {
          generatedAt: new Date().toISOString(),
          methodology: METHODOLOGY,
          cohort: {
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
    const { photos, raw } = await fetchAllLabeledPhotos();

    const { data: allProfiles, error: allErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id, name, title, company, location, questionnaire_data");

    if (allErr) throw allErr;

    const profilesById = new Map<string, EnrichmentProfile>();
    const questionnaireByUserId = new Map<string, EnrichmentQuestionnaire>();
    const allSet = new Set<string>();
    for (const row of (allProfiles ?? []) as unknown as RawProfileRow[]) {
      allSet.add(row.id);
      profilesById.set(row.id, {
        id: row.id,
        name: row.name,
        title: row.title,
        company: row.company,
        location: row.location,
      });
      const q = row.questionnaire_data;
      if (q && typeof q === "object") {
        const growthArea = typeof q.growthArea === "string" ? q.growthArea : null;
        const talkTopic = typeof q.talkTopic === "string" ? q.talkTopic : null;
        if (growthArea || talkTopic) {
          questionnaireByUserId.set(row.id, { growthArea, talkTopic });
        }
      }
    }
    const networkDenom = allSet.size;

    const enrichmentPhotos: EnrichmentPhotoRow[] = raw.map((r) => ({
      user_id: r.user_id,
      activity_tag: r.activity_tag,
      caption: r.caption ?? null,
    }));
    const enrichmentByTag = buildThemeEnrichment(
      enrichmentPhotos,
      profilesById,
      questionnaireByUserId
    );

    const networkBuilt = buildThemesForDenominator(photos, allSet, networkDenom);
    const networkPhotoByTag = labeledPhotoCountsByTag(photos, allSet);
    const networkThemes = attachRanksAndPhotoCounts(
      networkBuilt.themes.slice(0, MAX_THEMES_RETURN),
      networkPhotoByTag,
      enrichmentByTag
    );

    return NextResponse.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        methodology: METHODOLOGY,
        cohort: {
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
