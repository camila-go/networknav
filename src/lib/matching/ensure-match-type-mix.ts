import type { Match } from "@/types";
import { generateConversationStarters } from "./market-basket-analysis";

export type MatchBuildRow = {
  match: Match;
  affinityScore: number;
  strategicScore: number;
  meta: {
    firstName?: string;
    title?: string;
    company?: string;
    seed: string;
  };
};

/**
 * When there are 2+ matches but MBA labeled them all the same type, split the list so
 * users always see both High-Affinity and Strategic chips (sorted by similarity vs complement signal).
 */
export function ensureMatchTypeMix(
  rows: MatchBuildRow[],
  viewerFirstName: string | undefined
): Match[] {
  if (rows.length < 2) {
    return rows.map((r) => r.match);
  }

  const hasHa = rows.some((r) => r.match.type === "high-affinity");
  const hasSt = rows.some((r) => r.match.type === "strategic");
  if (hasHa && hasSt) {
    return rows.map((r) => r.match);
  }

  const sorted = [...rows].sort((a, b) => {
    const da = a.affinityScore - a.strategicScore;
    const db = b.affinityScore - b.strategicScore;
    if (db !== da) return db - da;
    return b.match.score - a.match.score;
  });

  const haCount = Math.ceil(sorted.length / 2);
  sorted.forEach((row, i) => {
    const newType: Match["type"] =
      i < haCount ? "high-affinity" : "strategic";
    if (row.match.type === newType) return;
    row.match.type = newType;
    row.match.conversationStarters = generateConversationStarters(
      row.match.commonalities,
      newType,
      row.meta.firstName,
      {
        theirTitle: row.meta.title,
        theirCompany: row.meta.company,
        viewerFirstName,
        seed: row.meta.seed,
      }
    );
  });

  return sorted.map((r) => r.match);
}
