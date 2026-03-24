import { NextResponse } from "next/server";
import { questionnaireResponses, users } from "@/lib/stores";
import { getUserById } from "@/lib/stores/users-store";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { QuestionnaireData } from "@/types";

interface InterestAgg {
  label: string;
  count: number;
  userIds: string[];
}

const RECHARGE = [
  "Reading", "Meditation", "Hiking", "Travel", "Cooking", "Photography",
  "Music", "Podcasts", "Gardening", "Art", "Writing", "Gaming",
];
const FITNESS = [
  "Running", "Yoga", "Weightlifting", "Swimming", "Cycling", "Tennis",
  "Golf", "CrossFit", "Pilates", "Hiking", "Basketball", "Soccer",
];
const VOLUNTEER = [
  "Education", "Environment", "Healthcare", "Youth mentorship", "Animal welfare",
  "Homelessness", "Arts & culture", "Technology access", "Food security",
];
const LEADERSHIP = [
  "Team development", "Innovation", "Culture building", "Strategic growth",
  "Operational excellence", "Customer focus", "Digital transformation",
];
const NETWORKING = [
  "Find mentors", "Learn from peers", "Explore partnerships", "Career growth",
  "Industry insights", "Build community", "Share knowledge",
];
const CONTENT = [
  "Business podcasts", "Tech blogs", "Leadership books", "Industry news",
  "TED Talks", "Online courses", "Newsletters", "Research papers",
];

function pickPool(arr: string[], seed: number, count: number, salt: number): string[] {
  const shuffled = [...arr].sort((a, b) => {
    const ah = (a.charCodeAt(0) + seed + salt) % 100;
    const bh = (b.charCodeAt(0) + seed + salt) % 100;
    return ah - bh;
  });
  return shuffled.slice(0, count);
}

/** When no questionnaire, assign a realistic mix of interests per user so stats reflect whole network */
function demoLabelsForUser(userId: string): string[] {
  const seed = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const out = new Set<string>();
  for (const s of pickPool(RECHARGE, seed, 2, 1)) out.add(s);
  for (const s of pickPool(FITNESS, seed, 2, 2)) out.add(s);
  for (const s of pickPool(VOLUNTEER, seed, 1, 3)) out.add(s);
  for (const s of pickPool(LEADERSHIP, seed, 2, 4)) out.add(s);
  for (const s of pickPool(NETWORKING, seed, 1, 5)) out.add(s);
  for (const s of pickPool(CONTENT, seed, 1, 6)) out.add(s);
  out.add(["Technology", "Finance", "Healthcare", "Education", "Non-profit"][seed % 5]);
  return [...out];
}

function collectLabels(responses: QuestionnaireData): string[] {
  const out: string[] = [];
  const arrays: (keyof QuestionnaireData)[] = [
    "rechargeActivities",
    "fitnessActivities",
    "volunteerCauses",
    "contentPreferences",
    "customInterests",
    "leadershipPriorities",
    "networkingGoals",
  ];
  for (const key of arrays) {
    const v = responses[key];
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string" && item.trim()) out.push(item.trim());
      }
    }
  }
  return out;
}

type ProfileRow = {
  id: string;
  name: string;
  questionnaire_data: unknown;
  interests?: string[] | null;
};

function labelsForProfile(row: ProfileRow, useDemoWhenEmpty: boolean): string[] {
  const q = row.questionnaire_data as QuestionnaireData | null | undefined;
  if (q && collectLabels(q).length > 0) {
    return collectLabels(q);
  }
  const extra = Array.isArray(row.interests)
    ? row.interests.filter((x): x is string => typeof x === "string" && x.trim()).map((x) => x.trim())
    : [];
  if (extra.length > 0) return extra;
  return useDemoWhenEmpty ? demoLabelsForUser(row.id) : [];
}

function aggregateFromProfiles(
  profileRows: ProfileRow[],
  opts: { useDemoWhenEmpty: boolean; resolveName: (userId: string) => string }
) {
  const totalUsers = profileRows.length;

  if (totalUsers === 0) {
    return {
      totalUsers: 0,
      stats: [] as Array<{
        interest: string;
        count: number;
        percentage: number;
        members: { userId: string; name: string }[];
      }>,
      headline: null as string | null,
      topInterest: null as string | null,
      topCount: 0,
      topPercentage: 0,
    };
  }

  const map = new Map<string, InterestAgg>();

  for (const row of profileRows) {
    const labels = labelsForProfile(row, opts.useDemoWhenEmpty);

    const seen = new Set<string>();
    for (const label of labels) {
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const cur = map.get(key) || { label, count: 0, userIds: [] };
      cur.count += 1;
      if (cur.userIds.length < 20) cur.userIds.push(row.id);
      map.set(key, cur);
    }
  }

  const stats = Array.from(map.values())
    .map((s) => ({
      interest: s.label,
      count: s.count,
      percentage: Math.round((s.count / totalUsers) * 1000) / 10,
      members: s.userIds.map((userId) => ({
        userId,
        name: opts.resolveName(userId),
      })),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 14);

  const top = stats[0];
  const headline = top
    ? `${top.percentage}% of members share "${top.interest}" — ${top.count} of ${totalUsers}`
    : null;

  return {
    totalUsers,
    stats,
    headline,
    topInterest: top?.interest ?? null,
    topCount: top?.count ?? 0,
    topPercentage: top?.percentage ?? 0,
  };
}

const PROFILE_PAGE = 800;

async function fetchSupabaseProfilesForStats(): Promise<ProfileRow[] | null> {
  if (!supabaseAdmin) return null;
  const rows: ProfileRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, name, questionnaire_data, interests")
      .eq("is_active", true)
      .not("name", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + PROFILE_PAGE - 1);

    if (error) {
      console.error("[explore/interest-stats] Supabase:", error);
      return null;
    }
    if (!data?.length) break;
    for (const r of data) {
      const name = typeof r.name === "string" ? r.name.trim() : "";
      if (!name) continue;
      rows.push({
        id: r.id,
        name,
        questionnaire_data: r.questionnaire_data,
        interests: (r as { interests?: string[] | null }).interests ?? null,
      });
    }
    if (data.length < PROFILE_PAGE) break;
    from += PROFILE_PAGE;
  }
  return rows;
}

export async function GET() {
  try {
    if (isSupabaseConfigured && supabaseAdmin) {
      const profileRows = await fetchSupabaseProfilesForStats();
      if (profileRows === null) {
        return NextResponse.json(
          { success: false, error: "Failed to load member stats" },
          { status: 500 }
        );
      }
      const nameById = new Map(profileRows.map((p) => [p.id, p.name]));
      const data = aggregateFromProfiles(profileRows, {
        useDemoWhenEmpty: false,
        resolveName: (userId) => nameById.get(userId) ?? "Member",
      });
      return NextResponse.json({ success: true, data });
    }

    const allUsers = Array.from(users.values());
    const profileRows: ProfileRow[] = allUsers.map((u) => {
      const q = questionnaireResponses.get(u.id);
      return {
        id: u.id,
        name: u.profile?.name || "Member",
        questionnaire_data: q?.responses ?? null,
        interests: null,
      };
    });

    const data = aggregateFromProfiles(profileRows, {
      useDemoWhenEmpty: true,
      resolveName: (userId) => getUserById(userId)?.name ?? "Member",
    });

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[explore/interest-stats]", e);
    return NextResponse.json(
      { success: false, error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
