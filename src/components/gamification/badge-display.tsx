"use client";

import { Trophy } from "lucide-react";
import type { BadgeProgress } from "@/lib/gamification";
import type { UserBadge, BadgeType, BadgeTier } from "@/types";
import { cn } from "@/lib/utils";
import {
  BADGE_TYPE_ORDER,
  BADGE_NAMES,
  BADGE_TIER_STYLES,
  BadgeGridTile,
  BadgeTypeIcon,
} from "./badge-grid-tile";

export type { BadgeProgress };

interface BadgeDisplayProps {
  badges: UserBadge[];
  progress?: BadgeProgress[];
  showProgress?: boolean;
  compact?: boolean;
  /** Section title when not embedded */
  heading?: string;
  /** Only the grid — parent supplies outer chrome and title */
  embedded?: boolean;
}

export function BadgeDisplay({
  badges,
  progress,
  showProgress = false,
  compact = false,
  heading = "Badges",
  embedded = false,
}: BadgeDisplayProps) {
  if (compact) {
    return <CompactBadgeDisplay badges={badges} />;
  }

  const grid = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BADGE_TYPE_ORDER.map((type) => {
        const earnedBadges = badges.filter((b) => b.badgeType === type);
        const highestTier = getHighestTier(earnedBadges);
        const badgeProgress = progress?.find((p) => p.type === type);

        return (
          <BadgeGridTile
            key={type}
            type={type}
            tier={highestTier}
            progress={badgeProgress}
            layout="compact"
            showProgress={showProgress}
          />
        );
      })}
    </div>
  );

  if (embedded) {
    return grid;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
        <Trophy className="h-5 w-5 text-yellow-400" aria-hidden />
        {heading}
      </h3>
      {grid}
    </div>
  );
}

function CompactBadgeDisplay({ badges }: { badges: UserBadge[] }) {
  if (badges.length === 0) {
    return null;
  }

  const uniqueBadges = getUniqueBadgesWithHighestTier(badges);

  return (
    <div className="flex flex-wrap gap-2">
      {uniqueBadges.map((badge) => {
        const tierColor = BADGE_TIER_STYLES[badge.tier];
        return (
          <div
            key={`${badge.badgeType}-${badge.tier}`}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2 py-1",
              tierColor.card,
              tierColor.border
            )}
          >
            <span className={tierColor.title}>
              <BadgeTypeIcon type={badge.badgeType} className="h-4 w-4" />
            </span>
            <span className={cn("text-xs font-medium", tierColor.title)}>
              {BADGE_NAMES[badge.badgeType as BadgeType]}{" "}
              <span className="opacity-80">({badge.tier})</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function getHighestTier(badges: UserBadge[]): BadgeTier | null {
  if (badges.some((b) => b.tier === "gold")) return "gold";
  if (badges.some((b) => b.tier === "silver")) return "silver";
  if (badges.some((b) => b.tier === "bronze")) return "bronze";
  return null;
}

function getUniqueBadgesWithHighestTier(badges: UserBadge[]): UserBadge[] {
  const badgeMap = new Map<BadgeType, UserBadge>();

  for (const badge of badges) {
    const existing = badgeMap.get(badge.badgeType);
    if (!existing) {
      badgeMap.set(badge.badgeType, badge);
    } else {
      const tierOrder: BadgeTier[] = ["bronze", "silver", "gold"];
      if (tierOrder.indexOf(badge.tier) > tierOrder.indexOf(existing.tier)) {
        badgeMap.set(badge.badgeType, badge);
      }
    }
  }

  return Array.from(badgeMap.values());
}
