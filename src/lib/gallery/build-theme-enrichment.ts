import type {
  ProjectorEnrichmentFact,
  ProjectorThemeEnrichment,
} from "@/types/gallery";

export type EnrichmentPhotoRow = {
  user_id: string;
  activity_tag: string | null;
  caption?: string | null;
};

export type EnrichmentProfile = {
  id: string;
  name?: string | null;
  title?: string | null;
  company?: string | null;
  location?: string | null;
};

export type EnrichmentQuestionnaire = {
  growthArea?: string | null;
  talkTopic?: string | null;
};

const TOP_N = 3;

function normalize(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function modeOf(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const v = normalize(raw);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

function topNBy(
  values: Array<string | null | undefined>,
  n: number,
  denominator: number
): ProjectorEnrichmentFact[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const v = normalize(raw);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const rows: ProjectorEnrichmentFact[] = [];
  for (const [value, count] of counts) {
    const percent =
      denominator > 0 ? Math.round((count / denominator) * 1000) / 10 : 0;
    rows.push({ value, count, percent });
  }
  rows.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return rows.slice(0, n);
}

/**
 * Build per-tag enrichment facts by aggregating profile + questionnaire data
 * across the distinct users who labeled a photo with each tag.
 */
export function buildThemeEnrichment(
  photos: EnrichmentPhotoRow[],
  profilesById: Map<string, EnrichmentProfile>,
  questionnaireByUserId: Map<string, EnrichmentQuestionnaire>
): Map<string, ProjectorThemeEnrichment> {
  const tagToUsers = new Map<string, Set<string>>();
  const tagCaption = new Map<string, { text: string; userId: string }>();

  for (const row of photos) {
    const uid = row.user_id;
    const tag = row.activity_tag?.trim().toLowerCase();
    if (!uid || !tag) continue;
    if (!profilesById.has(uid)) continue;

    if (!tagToUsers.has(tag)) tagToUsers.set(tag, new Set());
    tagToUsers.get(tag)!.add(uid);

    const caption = normalize(row.caption ?? null);
    if (caption && !tagCaption.has(tag)) {
      tagCaption.set(tag, { text: caption, userId: uid });
    }
  }

  const out = new Map<string, ProjectorThemeEnrichment>();
  for (const [tag, userIds] of tagToUsers) {
    const profiles = Array.from(userIds)
      .map((id) => profilesById.get(id))
      .filter((p): p is EnrichmentProfile => !!p);

    const denom = profiles.length;
    const titles = profiles.map((p) => p.title);
    const locations = profiles.map((p) => p.location);
    const companies = profiles.map((p) => p.company);

    const qResponses = Array.from(userIds)
      .map((id) => questionnaireByUserId.get(id))
      .filter((q): q is EnrichmentQuestionnaire => !!q);

    const captionRef = tagCaption.get(tag);
    const captionUser = captionRef ? profilesById.get(captionRef.userId) : null;

    out.set(tag, {
      topTitles: topNBy(titles, TOP_N, denom),
      topLocations: topNBy(locations, TOP_N, denom),
      topCompanies: topNBy(companies, TOP_N, denom),
      topGrowthArea: modeOf(qResponses.map((q) => q.growthArea)),
      topTalkTopic: modeOf(qResponses.map((q) => q.talkTopic)),
      sampleCaption:
        captionRef && captionUser
          ? {
              text: captionRef.text,
              userName: normalize(captionUser.name) ?? "Attendee",
            }
          : null,
      profiledUserCount: denom,
    });
  }

  return out;
}

export function emptyEnrichment(): ProjectorThemeEnrichment {
  return {
    topTitles: [],
    topLocations: [],
    topCompanies: [],
    topGrowthArea: null,
    topTalkTopic: null,
    sampleCaption: null,
    profiledUserCount: 0,
  };
}
