import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users, questionnaireResponses } from "@/lib/stores";
import { cookies } from "next/headers";
import type {
  SearchFilters,
  AttendeeSearchResult,
  Commonality,
  PublicUser,
  QuestionnaireData,
  MatchType,
} from "@/types";
import { QUESTIONNAIRE_SECTIONS } from "@/lib/questionnaire-data";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { isLiveDatabaseMode } from "@/lib/supabase/data-mode";
import { normalizeCompany } from "@/lib/company/normalize";
import type { UserProfileRow } from "@/types/database";
import {
  calculateMatchScore,
  determineMatchType,
  rescaleCohortScores,
  type EmbeddingPair,
} from "@/lib/matching/market-basket-analysis";
import { enrichProfileRowsWithResolvedPhotoUrl } from "@/lib/profile/profile-photo-url";

// Get label for a value from questionnaire options
function getLabel(questionId: string, value: string): string {
  for (const section of QUESTIONNAIRE_SECTIONS) {
    const question = section.questions.find((q) => q.id === questionId);
    if (question && question.options) {
      const option = question.options.find((o) => o.value === value);
      if (option) return option.label;
    }
  }
  return value;
}

/**
 * Unified scoring: the explore page uses the same Market Basket Analysis path
 * as the dashboard matches page, so the same user pair always produces the
 * same score and tag across both surfaces. Optional embedding pair boosts
 * affinity via cosine similarity when both vectors are available.
 */
function scoreCandidate(
  currentResponses: Record<string, unknown>,
  candidateResponses: Record<string, unknown>,
  embeddings?: EmbeddingPair
): { rawTotal: number; matchType: MatchType; commonalities: Commonality[] } {
  const matchScore = calculateMatchScore(
    currentResponses as Partial<QuestionnaireData>,
    candidateResponses as Partial<QuestionnaireData>,
    embeddings
  );
  return {
    rawTotal: matchScore.totalScore,
    matchType: determineMatchType(matchScore),
    commonalities: matchScore.commonalities,
  };
}

/** Archetype option values (must stay aligned with questionnaire `archetype` question). */
const ARCHETYPE_VALUES = new Set([
  "builder",
  "strategist",
  "creative",
  "analyst",
  "operator",
  "connector",
]);

// Check if user matches filters
function matchesFilters(
  responses: Record<string, unknown>,
  userProfile: { location?: string },
  filters: SearchFilters,
  /** Denormalized chips on `user_profiles.interests` (personality + archetype from questionnaire API). */
  profileInterestTags?: string[] | null
): boolean {
  const chips =
    profileInterestTags?.filter((c): c is string => typeof c === "string" && c.length > 0) ?? [];

  const userArchetype =
    (typeof responses.archetype === "string" ? responses.archetype : undefined) ??
    chips.find((c) => ARCHETYPE_VALUES.has(c));

  if (filters.archetypes && filters.archetypes.length > 0) {
    if (!userArchetype || !filters.archetypes.includes(userArchetype)) {
      return false;
    }
  }

  if (filters.teamQualities && filters.teamQualities.length > 0) {
    const userQ = (responses.teamQualities as string[]) || [];
    const hasMatch = filters.teamQualities.some((p) => userQ.includes(p));
    if (!hasMatch) return false;
  }

  const personalityFromJson = (responses.personalityTags as string[]) || [];
  const personalityFromChips = chips.filter((c) => !ARCHETYPE_VALUES.has(c));
  const userPersonalityTags = [...new Set([...personalityFromJson, ...personalityFromChips])];

  if (filters.personalityTags && filters.personalityTags.length > 0) {
    const hasMatch = filters.personalityTags.some((p) => userPersonalityTags.includes(p));
    if (!hasMatch) return false;
  }

  if (filters.interests && filters.interests.length > 0) {
    const userInterests = [
      ...userPersonalityTags,
      ...((responses.teamQualities as string[]) || []),
      ...(userArchetype ? [userArchetype] : []),
    ];
    const hasMatch = filters.interests.some((i) => userInterests.includes(i));
    if (!hasMatch) return false;
  }

  // Location filter (partial match)
  if (filters.location && filters.location.trim() !== "") {
    const userLocation = userProfile.location?.toLowerCase() || "";
    if (!userLocation.includes(filters.location.toLowerCase())) {
      return false;
    }
  }

  return true;
}

const INTEREST_FIELD_IDS = [
  "personalityTags",
  "teamQualities",
] as const;

/** Text blob for interest-scoped search (chips + “find people who enjoy X”) */
function interestSearchBlob(
  responses: Record<string, unknown>,
  profileInterestTags: string[],
  galleryActivityTags: string[] = []
): string {
  const parts: string[] = [
    ...profileInterestTags.map((t) => t.toLowerCase()),
    ...galleryActivityTags.map((t) => t.toLowerCase()),
  ];
  for (const id of INTEREST_FIELD_IDS) {
    const arr = responses[id as string];
    if (!Array.isArray(arr)) continue;
    for (const v of arr) {
      if (typeof v !== "string" || !v.trim()) continue;
      parts.push(v.toLowerCase());
      parts.push(getLabel(id, v).toLowerCase());
    }
  }
  for (const k of ["talkTopic", "personalInterest", "headline", "funFact", "roleSummary"] as const) {
    const s = responses[k as string];
    if (typeof s === "string" && s.trim()) parts.push(s.toLowerCase());
  }
  return parts.join(" ");
}

function collectAllQuestionnaireStrings(r: Record<string, unknown>): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string" && v.trim()) {
      out.push(v);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (typeof v === "object") {
      Object.values(v as object).forEach(walk);
    }
  };
  walk(r);
  return out;
}

/** Widen search: raw values + option labels for every questionnaire multi-select we know */
function fullSearchBlob(
  userProfile: { name: string; title: string; company?: string },
  responses: Record<string, unknown>,
  profileInterestTags: string[],
  galleryActivityTags: string[] = []
): string {
  const parts: string[] = [
    userProfile.name,
    userProfile.title,
    normalizeCompany(userProfile.company) || "",
    ...profileInterestTags,
    ...galleryActivityTags,
    ...collectAllQuestionnaireStrings(responses),
  ];
  const labelKeys = [
    ...INTEREST_FIELD_IDS,
    "archetype",
  ] as const;
  for (const id of labelKeys) {
    const v = responses[id as string];
    if (Array.isArray(v)) {
      for (const x of v) {
        if (typeof x === "string") parts.push(getLabel(id as string, x));
      }
    } else if (typeof v === "string") {
      parts.push(getLabel(id as string, v));
    }
  }
  return parts.join(" ").toLowerCase();
}

/** Tokens for stem-style matching (fish ↔ fishing, kayak ↔ kayaking). */
function tokenizeBlobWords(blobLower: string): string[] {
  return blobLower
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0);
}

/**
 * Match if the blob contains the term, or any word overlaps by prefix/containment
 * (handles inflections not stored literally in questionnaire / gallery tags).
 */
function termMatchesInBlob(term: string, blobLower: string): boolean {
  if (!term) return true;
  if (blobLower.includes(term)) return true;
  if (term.length < 3) return false;
  for (const w of tokenizeBlobWords(blobLower)) {
    if (w.length < 3) continue;
    if (w.startsWith(term) || term.startsWith(w)) return true;
    if (w.includes(term) || term.includes(w)) return true;
  }
  return false;
}

function blobMatchesAllSearchTerms(blob: string, searchTerms: string[]): boolean {
  const hay = blob.toLowerCase();
  return searchTerms.every((t) => termMatchesInBlob(t, hay));
}

function matchedInterestLabels(
  searchTerms: string[],
  responses: Record<string, unknown>,
  profileInterestTags: string[],
  galleryActivityTags: string[] = []
): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const id of INTEREST_FIELD_IDS) {
    const arr = responses[id as string];
    if (!Array.isArray(arr)) continue;
    for (const val of arr) {
      if (typeof val !== "string") continue;
      const label = getLabel(id, val);
      const hay = `${val} ${label}`.toLowerCase();
      if (searchTerms.some((t) => termMatchesInBlob(t, hay))) {
        if (!seen.has(label)) {
          seen.add(label);
          labels.push(label);
        }
      }
    }
  }
  const customs = (responses.customInterests as string[]) || [];
  for (const c of customs) {
    const low = c.toLowerCase();
    if (searchTerms.some((t) => termMatchesInBlob(t, low)) && !seen.has(c)) {
      seen.add(c);
      labels.push(c);
    }
  }
  for (const t of profileInterestTags) {
    const low = t.toLowerCase();
    if (searchTerms.some((st) => termMatchesInBlob(st, low)) && !seen.has(t)) {
      seen.add(t);
      labels.push(t);
    }
  }
  for (const raw of galleryActivityTags) {
    const low = raw.toLowerCase().trim();
    if (!low) continue;
    if (searchTerms.some((st) => termMatchesInBlob(st, low)) && !seen.has(raw)) {
      seen.add(raw);
      labels.push(raw);
    }
  }
  return labels.slice(0, 5);
}

type SearchScope = "all" | "interests";

function keywordMatchResult(
  userProfile: { name: string; title: string; company?: string },
  responses: Record<string, unknown>,
  keywords: string,
  profileInterestTags: string[],
  scope: SearchScope,
  galleryActivityTags: string[] = []
): { ok: boolean; labels: string[] } {
  const searchTerms = keywords.toLowerCase().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) {
    return { ok: true, labels: [] };
  }
  const blob =
    scope === "interests"
      ? interestSearchBlob(responses, profileInterestTags, galleryActivityTags)
      : fullSearchBlob(
          userProfile,
          responses,
          profileInterestTags,
          galleryActivityTags
        );
  const ok = searchTerms.every((term) => blob.includes(term));
  const labels = ok
    ? matchedInterestLabels(
        searchTerms,
        responses,
        profileInterestTags,
        galleryActivityTags
      )
    : [];
  return { ok, labels };
}

// Fallback demo users when no data is seeded
function getDemoUsers(currentResponses: Record<string, unknown>): AttendeeSearchResult[] {
  const demoProfiles = [
    {
      id: "demo-sarah",
      name: "Sarah Chen",
      title: "Engineering Leader",
      company: "TechCorp",
      location: "San Francisco, CA",
      responses: {
        archetype: "builder",
        teamQualities: ["problem-solving", "collaboration"],
        personalityTags: ["planner", "early-bird"],
        talkTopic: "distributed systems and team culture",
        growthArea: "public speaking",
        personalInterest: "trail running and sourdough",
        roleSummary: "I run engineering orgs that ship reliably.",
        headline: "Here to learn, connect, and swap war stories",
        funFact: "I've run three marathons on three continents",
      },
    },
    {
      id: "demo-marcus",
      name: "Marcus Johnson",
      title: "Chief Executive Officer",
      company: "FinanceFlow",
      location: "New York, NY",
      responses: {
        archetype: "strategist",
        teamQualities: ["perspective", "ideas"],
        personalityTags: ["night-owl", "social"],
        talkTopic: "capital markets and fintech regulation",
        growthArea: "storytelling for investors",
        personalInterest: "jazz vinyl and cooking",
        roleSummary: "I lead a fintech through growth and compliance.",
        headline: "Looking for bold ideas and honest feedback",
        funFact: "I once debated policy on live radio by accident",
      },
    },
    {
      id: "demo-elena",
      name: "Elena Rodriguez",
      title: "Healthcare Tech Innovator",
      company: "MedConnect AI",
      location: "Austin, TX",
      responses: {
        archetype: "connector",
        teamQualities: ["energy", "collaboration"],
        personalityTags: ["go-with-the-flow", "social"],
        talkTopic: "AI in clinical workflows",
        growthArea: "enterprise sales",
        personalInterest: "painting and rescue dogs",
        roleSummary: "I build AI tools clinicians actually use.",
        headline: "Here to meet operators and skeptics alike",
        funFact: "Fluent in three languages, learning a fourth",
      },
    },
    {
      id: "demo-david",
      name: "David Park",
      title: "Strategic Advisor",
      company: "McKinsey & Company",
      location: "Chicago, IL",
      responses: {
        archetype: "analyst",
        teamQualities: ["perspective", "problem-solving"],
        personalityTags: ["planner", "recharge-solo"],
        talkTopic: "scenario planning and board dynamics",
        growthArea: "facilitation at scale",
        personalInterest: "chess and architecture tours",
        roleSummary: "I help leaders make decisions under uncertainty.",
        headline: "Seeking sharp questions, not easy answers",
        funFact: "Published a zine about Chicago bridges",
      },
    },
    {
      id: "demo-priya",
      name: "Priya Sharma",
      title: "AI/ML Technology Leader",
      company: "NeuralScale",
      location: "Seattle, WA",
      responses: {
        archetype: "builder",
        teamQualities: ["ideas", "problem-solving"],
        personalityTags: ["night-owl", "social"],
        talkTopic: "ML infrastructure and responsible AI",
        growthArea: "people leadership at scale",
        personalInterest: "board games and hiking",
        roleSummary: "I scale ML platforms for product teams.",
        headline: "Here for technical depth and real-world ethics",
        funFact: "Speedruns puzzle games for charity",
      },
    },
    {
      id: "demo-james",
      name: "James Wilson",
      title: "Revenue Leader",
      company: "CloudScale Enterprise",
      location: "Denver, CO",
      responses: {
        archetype: "operator",
        teamQualities: ["energy", "collaboration"],
        personalityTags: ["early-bird", "planner"],
        talkTopic: "enterprise GTM and forecasting",
        growthArea: "coaching sales managers",
        personalInterest: "fly fishing and BBQ",
        roleSummary: "I build repeatable revenue engines.",
        headline: "Want to trade playbooks with peers",
        funFact: "Won a chili cook-off with a secret spice blend",
      },
    },
    {
      id: "demo-alex",
      name: "Alex Rivera",
      title: "Product Leader",
      company: "GameStudio Interactive",
      location: "Los Angeles, CA",
      responses: {
        archetype: "creative",
        teamQualities: ["ideas", "energy"],
        personalityTags: ["go-with-the-flow", "social"],
        talkTopic: "live ops and player communities",
        growthArea: "narrative design",
        personalInterest: "indie games and streaming",
        roleSummary: "I ship games players come back to nightly.",
        headline: "Here for creative collisions",
        funFact: "Voice-cameo in a game nobody noticed",
      },
    },
  ];

  return demoProfiles.map((demo) => {
    const { rawTotal, matchType, commonalities } = scoreCandidate(currentResponses, demo.responses);

    return {
      user: {
        id: demo.id,
        profile: {
          name: demo.name,
          title: demo.title,
          company: demo.company,
          location: demo.location,
        },
        questionnaireCompleted: true,
      },
      matchPercentage: Math.round(rawTotal * 100),
      matchType,
      topCommonalities: commonalities.length > 0 ? commonalities : [
        { category: "professional", description: "Summit networking profile", weight: 0.8 },
      ],
      questionnaire: {
        archetype: demo.responses.archetype,
        teamQualities: demo.responses.teamQualities,
        personalityTags: demo.responses.personalityTags,
        headline: demo.responses.headline,
      },
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;

    let currentUserId: string | undefined;
    let currentUserEmail: string | undefined;
    if (session) {
      currentUserId = session.userId;
      currentUserEmail = session.email;
    } else if (deviceId) {
      currentUserId = deviceId;
    } else {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      filters,
      keywords,
      page = 1,
      pageSize = 20,
      sortBy = "relevance",
      searchScope: searchScopeRaw,
    } = body as {
      filters?: SearchFilters;
      keywords?: string;
      page?: number;
      pageSize?: number;
      sortBy?: "relevance" | "match" | "name" | "level";
      /** interests = only questionnaire interest fields (profile chips / hobby search) */
      searchScope?: "all" | "interests";
    };
    const searchScope: SearchScope =
      searchScopeRaw === "interests" ? "interests" : "all";

    // Get current user's responses for match calculation
    let currentResponses: Record<string, unknown> = {};
    let currentUserEmbedding: number[] | null = null;

    // Try Supabase first for current user's questionnaire data + embedding
    if (isSupabaseConfigured && supabaseAdmin) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        currentUserId
      );
      type MaybeProfile = {
        questionnaire_data?: Record<string, unknown>;
        profile_embedding?: number[] | null;
      } | null;
      let currentProfile: MaybeProfile = null;
      if (isUuid) {
        const byId = await supabaseAdmin
          .from("user_profiles")
          .select("questionnaire_data, profile_embedding")
          .eq("id", currentUserId)
          .maybeSingle();
        currentProfile = (byId.data ?? null) as MaybeProfile;
      }
      const needsAuthLookup =
        !currentProfile || !currentProfile.questionnaire_data;
      if (needsAuthLookup) {
        const byAuth = await supabaseAdmin
          .from("user_profiles")
          .select("questionnaire_data, profile_embedding")
          .eq("user_id", currentUserId)
          .maybeSingle();
        currentProfile = (byAuth.data ?? null) as MaybeProfile;
      }
      const qData = currentProfile?.questionnaire_data;
      if (qData) {
        currentResponses = qData;
      }
      if (Array.isArray(currentProfile?.profile_embedding)) {
        currentUserEmbedding = currentProfile!.profile_embedding as number[];
      }
    }
    
    // Fall back to in-memory store
    if (Object.keys(currentResponses).length === 0) {
      const currentUserResponses = questionnaireResponses.get(currentUserId);
      currentResponses = currentUserResponses?.responses || {};
    }

    const results: AttendeeSearchResult[] = [];

    // Try to fetch from Supabase first
    if (isSupabaseConfigured && supabaseAdmin) {
      const supabaseResults = await searchSupabaseUsers(
        currentUserId,
        currentUserEmail,
        currentResponses,
        currentUserEmbedding,
        filters,
        keywords,
        searchScope
      );
      results.push(...supabaseResults);
    }
    
    // If no Supabase results, search through in-memory users
    if (results.length === 0) {
      for (const [, user] of users.entries()) {
        // Skip current user
        if (user.id === currentUserId) continue;
        
        // Skip users without completed questionnaires
        if (!user.questionnaireCompleted) continue;

        const candidateResponses = questionnaireResponses.get(user.id);
        if (!candidateResponses) continue;

        // Apply filters
        if (filters && Object.keys(filters).length > 0) {
          if (!matchesFilters(candidateResponses.responses, { location: user.location }, filters)) {
            continue;
          }
        }

        const userCompany = normalizeCompany(user.company);
        let searchMatchLabels: string[] | undefined;
        if (keywords && keywords.trim() !== "") {
          const { ok, labels } = keywordMatchResult(
            {
              name: user.name,
              title: user.title,
              company: userCompany,
            },
            candidateResponses.responses,
            keywords,
            [],
            searchScope
          );
          if (!ok) continue;
          if (labels.length > 0) searchMatchLabels = labels;
        }

        // Calculate match data (unified MBA path; in-memory store has no embeddings)
        const { rawTotal, matchType, commonalities } = scoreCandidate(
          currentResponses,
          candidateResponses.responses
        );

        const publicUser: PublicUser = {
          id: user.id,
          email: user.email,
          profile: {
            name: user.name,
            title: user.title,
            company: userCompany,
            photoUrl: user.photoUrl,
            location: user.location,
          },
          questionnaireCompleted: user.questionnaireCompleted,
        };

        results.push({
          user: publicUser,
          matchPercentage: Math.round(rawTotal * 100),
          matchType,
          topCommonalities: commonalities,
          searchMatchLabels,
          questionnaire: {
            archetype: candidateResponses.responses.archetype as string,
            teamQualities: candidateResponses.responses.teamQualities as string[],
            personalityTags: candidateResponses.responses.personalityTags as string[],
            headline: candidateResponses.responses.headline as string,
          },
        });
      }
    }

    if (
      !isLiveDatabaseMode() &&
      results.length === 0 &&
      (!filters || Object.keys(filters).length === 0) &&
      (!keywords || keywords.trim() === "")
    ) {
      const demoUsers = getDemoUsers(currentResponses);
      results.push(...demoUsers);
    }

    // Cohort-relative rescaling: stretch raw MBA scores across the visible band
    // so the best match in the result set reads ~95% even when raw overlap is thin.
    if (results.length > 0) {
      const rawFractions = results.map((r) => r.matchPercentage / 100);
      const rescaled = rescaleCohortScores(rawFractions);
      results.forEach((r, i) => {
        r.matchPercentage = Math.round(rescaled[i] * 100);
      });
    }

    // Sort results
    switch (sortBy) {
      case "match":
        results.sort((a, b) => b.matchPercentage - a.matchPercentage);
        break;
      case "name":
        results.sort((a, b) => a.user.profile.name.localeCompare(b.user.profile.name));
        break;
      case "level": {
        const archetypeOrder = ["strategist", "builder", "operator", "analyst", "creative", "connector"];
        results.sort((a, b) => {
          const aArc = a.questionnaire?.archetype || "";
          const bArc = b.questionnaire?.archetype || "";
          return archetypeOrder.indexOf(aArc) - archetypeOrder.indexOf(bArc);
        });
        break;
      }
      case "relevance":
      default:
        results.sort((a, b) => {
          if (keywords?.trim()) {
            const ma = a.searchMatchLabels?.length ?? 0;
            const mb = b.searchMatchLabels?.length ?? 0;
            if (mb !== ma) return mb - ma;
          }
          const scoreA = a.matchPercentage + a.topCommonalities.length * 5;
          const scoreB = b.matchPercentage + b.topCommonalities.length * 5;
          return scoreB - scoreA;
        });
    }

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = results.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      success: true,
      data: {
        results: paginatedResults,
        total: results.length,
        page,
        pageSize,
        hasMore: startIndex + pageSize < results.length,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Search users from Supabase
async function searchSupabaseUsers(
  currentUserId: string,
  currentUserEmail: string | undefined,
  currentResponses: Record<string, unknown>,
  currentUserEmbedding: number[] | null,
  filters?: SearchFilters,
  keywords?: string,
  searchScope: SearchScope = "all"
): Promise<AttendeeSearchResult[]> {
  if (!supabaseAdmin) return [];

  try {
    // Exclude self by profile `id` + email only. Do not filter on `user_id` neq:
    // many rows have null auth `user_id`, and in SQL `NULL <> x` drops those rows.
    let query = supabaseAdmin
      .from('user_profiles')
      .select('id, user_id, name, email, title, company, photo_url, location, questionnaire_data, questionnaire_completed, interests, profile_embedding')
      .eq('is_active', true)
      .not('name', 'is', null);

    if (currentUserEmail) {
      query = query.neq('email', currentUserEmail.toLowerCase());
    }

    if (currentUserId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      query = query.neq('id', currentUserId);
    }

    const hasKeyword = Boolean(keywords?.trim());
    const hasStructuralFilters = Boolean(
      filters &&
        ((filters.archetypes?.length ?? 0) > 0 ||
          (filters.teamQualities?.length ?? 0) > 0 ||
          (filters.personalityTags?.length ?? 0) > 0 ||
          (filters.interests?.length ?? 0) > 0 ||
          Boolean(filters.location?.trim()))
    );
    // Keyword scans are in-memory over fetched rows; cap raised so hobbies/gallery
    // matches aren’t lost when many profiles share the same recency bucket.
    const rowLimit = hasKeyword ? 4000 : hasStructuralFilters ? 2000 : 100;
    const { data: profiles, error } = await query
      .order("updated_at", { ascending: false })
      .limit(rowLimit);

    if (error) {
      console.error('Supabase search error:', error);
      return [];
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    const profilesEnriched = await enrichProfileRowsWithResolvedPhotoUrl(
      supabaseAdmin,
      profiles as UserProfileRow[]
    );

    const profileIds = (profilesEnriched as UserProfileRow[])
      .map((p) => p.id)
      .filter((id): id is string => Boolean(id));
    const galleryTagsByUserId = new Map<string, string[]>();
    if (profileIds.length > 0) {
      const { data: photoRows, error: photoErr } = await supabaseAdmin
        .from("user_photos")
        .select("user_id, activity_tag")
        .in("user_id", profileIds)
        .eq("status", "approved")
        .not("activity_tag", "is", null);
      if (!photoErr && photoRows?.length) {
        for (const row of photoRows) {
          const uid = row.user_id as string | undefined;
          const tag = String((row as { activity_tag?: string }).activity_tag ?? "").trim();
          if (!uid || !tag) continue;
          if (!galleryTagsByUserId.has(uid)) galleryTagsByUserId.set(uid, []);
          const arr = galleryTagsByUserId.get(uid)!;
          const low = tag.toLowerCase();
          if (!arr.some((t) => t.toLowerCase() === low)) arr.push(tag);
        }
      }
    }

    const results: AttendeeSearchResult[] = [];

    for (const profile of profilesEnriched as UserProfileRow[]) {
      if (!profile.name) continue;

      const candidateResponses = (profile.questionnaire_data || {}) as Record<string, unknown>;
      const profileInterestTags = Array.isArray(
        (profile as { interests?: string[] | null }).interests
      )
        ? ((profile as { interests?: string[] }).interests || []).filter(
            (x): x is string => typeof x === "string"
          )
        : [];
      const galleryActivityTags = galleryTagsByUserId.get(profile.id) ?? [];

      // Apply filters
      if (filters && Object.keys(filters).length > 0) {
        if (
          !matchesFilters(
            candidateResponses,
            { location: profile.location || undefined },
            filters,
            profileInterestTags
          )
        ) {
          continue;
        }
      }

      const profileCompany = normalizeCompany(profile.company) || undefined;
      let searchMatchLabels: string[] | undefined;
      if (keywords && keywords.trim() !== "") {
        const { ok, labels } = keywordMatchResult(
          {
            name: profile.name!,
            title: profile.title || "",
            company: profileCompany,
          },
          candidateResponses,
          keywords,
          profileInterestTags,
          searchScope,
          galleryActivityTags
        );
        if (!ok) continue;
        if (labels.length > 0) searchMatchLabels = labels;
      }

      // Calculate match data via unified MBA + optional embedding boost
      const candidateEmbedding =
        Array.isArray((profile as { profile_embedding?: number[] | null }).profile_embedding)
          ? ((profile as { profile_embedding?: number[] }).profile_embedding as number[])
          : null;
      const { rawTotal, matchType, commonalities } = scoreCandidate(
        currentResponses,
        candidateResponses,
        { v1: currentUserEmbedding, v2: candidateEmbedding }
      );

      results.push({
        user: {
          id: profile.id,
          email: profile.email || undefined,
          profile: {
            name: profile.name!,
            title: profile.title || '',
            company: profileCompany,
            photoUrl: profile.photo_url || undefined,
            location: profile.location || undefined,
          },
          questionnaireCompleted: profile.questionnaire_completed || false,
        },
        matchPercentage: Math.round(rawTotal * 100),
        matchType,
        topCommonalities: commonalities,
        searchMatchLabels,
        questionnaire: {
          archetype: (candidateResponses.archetype as string) || '',
          teamQualities: (candidateResponses.teamQualities as string[]) || [],
          personalityTags: (candidateResponses.personalityTags as string[]) || [],
          headline: (candidateResponses.headline as string) || '',
        },
      });
    }

    return results;
  } catch (error) {
    console.error('Error searching Supabase users:', error);
    return [];
  }
}

// GET endpoint to fetch filter options (cached for 30 minutes)
export async function GET() {
  // Import cache utilities
  const { cache, CACHE_KEYS, CACHE_TTLS } = await import("@/lib/cache");
  
  // Check cache first
  const cachedOptions = cache.get<Record<string, unknown>>(CACHE_KEYS.FILTER_OPTIONS);
  if (cachedOptions) {
    return NextResponse.json({
      success: true,
      data: cachedOptions,
      cached: true,
    });
  }
  
  // Build filter options from questionnaire data
  const filterOptions = {
    archetypes:
      QUESTIONNAIRE_SECTIONS[0].questions
        .find((q) => q.id === "archetype")
        ?.options?.map((o) => ({ value: o.value, label: o.label })) || [],
    teamQualities:
      QUESTIONNAIRE_SECTIONS[0].questions
        .find((q) => q.id === "teamQualities")
        ?.options?.map((o) => ({ value: o.value, label: o.label })) || [],
    personalityTags:
      QUESTIONNAIRE_SECTIONS[1].questions
        .find((q) => q.id === "personalityTags")
        ?.options?.map((o) => ({ value: o.value, label: o.label })) || [],
    interests: [
      ...(QUESTIONNAIRE_SECTIONS[1].questions
        .find((q) => q.id === "personalityTags")
        ?.options?.map((o) => ({
          value: o.value,
          label: o.label,
          category: "Summit style",
        })) || []),
      ...(QUESTIONNAIRE_SECTIONS[0].questions
        .find((q) => q.id === "teamQualities")
        ?.options?.map((o) => ({
          value: o.value,
          label: o.label,
          category: "Team strengths",
        })) || []),
    ],
  };

  // Cache the result for 30 minutes
  cache.set(CACHE_KEYS.FILTER_OPTIONS, filterOptions, CACHE_TTLS.FILTER_OPTIONS);

  return NextResponse.json({
    success: true,
    data: filterOptions,
    cached: false,
  });
}

