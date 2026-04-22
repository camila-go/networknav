import type { Match } from "@/types";
import { generateConversationStarters } from "./market-basket-analysis";

/**
 * Must stay in sync with HIGH_AFFINITY_MIN in market-basket-analysis.ts.
 * A row below this affinity threshold is too thin to earn the "high-affinity"
 * label via the force-mix relabel, even if the mix would otherwise demand it.
 */
const MIX_HIGH_AFFINITY_MIN = 0.15;

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
    const desired: Match["type"] = i < haCount ? "high-affinity" : "strategic";
    // Never promote a row into "high-affinity" unless its affinity signal
    // actually clears the threshold; otherwise we'd hand out the warmer
    // badge on ~3% matches and the mix becomes a lie.
    const newType: Match["type"] =
      desired === "high-affinity" && row.affinityScore < MIX_HIGH_AFFINITY_MIN
        ? "strategic"
        : desired;
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
