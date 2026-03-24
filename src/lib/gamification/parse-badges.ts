import type { BadgeType, BadgeTier, UserBadge } from "@/types";

/** Normalize API JSON (ISO dates, missing fields) into `UserBadge` */
export function parseBadgesFromApi(raw: unknown): UserBadge[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b: Record<string, unknown>) => ({
    id: String(b.id),
    userId: String(b.userId ?? ""),
    badgeType: b.badgeType as BadgeType,
    tier: b.tier as BadgeTier,
    progress: Number(b.progress ?? 0),
    earnedAt: new Date(String(b.earnedAt ?? 0)),
    updatedAt: new Date(String(b.updatedAt ?? 0)),
  }));
}
