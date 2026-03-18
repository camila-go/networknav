import { NextResponse } from "next/server";
import { questionnaireResponses, users } from "@/lib/stores";
import { getUserById } from "@/lib/stores/users-store";
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
  if (responses.industry && typeof responses.industry === "string") {
    out.push(responses.industry);
  }
  return out;
}

export async function GET() {
  try {
    const allUsers = Array.from(users.values());
    const totalUsers = allUsers.length;

    if (totalUsers === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalUsers: 0,
          stats: [],
          headline: null as string | null,
        },
      });
    }

    const map = new Map<string, InterestAgg>();

    for (const user of allUsers) {
      const q = questionnaireResponses.get(user.id);
      const hasQ =
        q?.responses &&
        collectLabels(q.responses as QuestionnaireData).length > 0;
      const labels = hasQ
        ? collectLabels(q!.responses as QuestionnaireData)
        : demoLabelsForUser(user.id);

      const seen = new Set<string>();
      for (const label of labels) {
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const cur = map.get(key) || { label, count: 0, userIds: [] };
        cur.count += 1;
        if (cur.userIds.length < 20) cur.userIds.push(user.id);
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
          name: getUserById(userId)?.name ?? "Member",
        })),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 14);

    const top = stats[0];
    const headline = top
      ? `${top.percentage}% of members share “${top.interest}” — ${top.count} of ${totalUsers}`
      : null;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        stats,
        headline,
        topInterest: top?.interest ?? null,
        topCount: top?.count ?? 0,
        topPercentage: top?.percentage ?? 0,
      },
    });
  } catch (e) {
    console.error("[explore/interest-stats]", e);
    return NextResponse.json(
      { success: false, error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
