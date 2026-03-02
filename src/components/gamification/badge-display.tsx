"use client";

import { MessageCircle, Users, Calendar, Flame, Trophy, Lock } from "lucide-react";
import type { UserBadge, BadgeType, BadgeTier } from "@/types";
import { cn } from "@/lib/utils";

interface BadgeProgress {
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  currentTier: BadgeTier | null;
  nextTier: BadgeTier | null;
  currentProgress: number;
  nextRequirement: number | null;
  percentToNext: number;
}

interface BadgeDisplayProps {
  badges: UserBadge[];
  progress?: BadgeProgress[];
  showProgress?: boolean;
  compact?: boolean;
}

const BADGE_ICONS: Record<BadgeType, React.ReactNode> = {
  conversation_starter: <MessageCircle className="h-5 w-5" />,
  super_connector: <Users className="h-5 w-5" />,
  meeting_master: <Calendar className="h-5 w-5" />,
  networking_streak: <Flame className="h-5 w-5" />,
  weekly_warrior: <Trophy className="h-5 w-5" />,
};

const BADGE_NAMES: Record<BadgeType, string> = {
  conversation_starter: "Conversation Starter",
  super_connector: "Super Connector",
  meeting_master: "Meeting Master",
  networking_streak: "Networking Streak",
  weekly_warrior: "Weekly Warrior",
};

const TIER_COLORS: Record<BadgeTier, { bg: string; border: string; text: string; gradient: string }> = {
  bronze: {
    bg: "bg-amber-900/30",
    border: "border-amber-600/50",
    text: "text-amber-500",
    gradient: "from-amber-700 to-amber-500",
  },
  silver: {
    bg: "bg-slate-400/20",
    border: "border-slate-400/50",
    text: "text-slate-300",
    gradient: "from-slate-400 to-slate-200",
  },
  gold: {
    bg: "bg-yellow-500/20",
    border: "border-yellow-500/50",
    text: "text-yellow-400",
    gradient: "from-yellow-500 to-amber-300",
  },
};

export function BadgeDisplay({ badges, progress, showProgress = false, compact = false }: BadgeDisplayProps) {
  if (compact) {
    return <CompactBadgeDisplay badges={badges} />;
  }

  const badgeTypes: BadgeType[] = [
    "conversation_starter",
    "super_connector",
    "meeting_master",
    "networking_streak",
    "weekly_warrior",
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-400" />
        Badges
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {badgeTypes.map((type) => {
          const earnedBadges = badges.filter(b => b.badgeType === type);
          const highestTier = getHighestTier(earnedBadges);
          const badgeProgress = progress?.find(p => p.type === type);

          return (
            <BadgeCard
              key={type}
              type={type}
              tier={highestTier}
              progress={badgeProgress}
              showProgress={showProgress}
            />
          );
        })}
      </div>
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
        const tierColor = TIER_COLORS[badge.tier];
        return (
          <div
            key={`${badge.badgeType}-${badge.tier}`}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full border",
              tierColor.bg,
              tierColor.border
            )}
          >
            <span className={tierColor.text}>
              {BADGE_ICONS[badge.badgeType]}
            </span>
            <span className={cn("text-xs font-medium", tierColor.text)}>
              {badge.tier.charAt(0).toUpperCase() + badge.tier.slice(1)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface BadgeCardProps {
  type: BadgeType;
  tier: BadgeTier | null;
  progress?: BadgeProgress;
  showProgress?: boolean;
}

function BadgeCard({ type, tier, progress, showProgress }: BadgeCardProps) {
  const isEarned = tier !== null;
  const tierColor = tier ? TIER_COLORS[tier] : null;

  return (
    <div className={cn(
      "relative rounded-xl p-3 border text-center transition-all duration-300",
      isEarned
        ? cn(tierColor?.bg, tierColor?.border)
        : "bg-white/5 border-white/10 opacity-60"
    )}>
      {/* Badge icon */}
      <div className={cn(
        "w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center",
        isEarned
          ? cn("bg-gradient-to-br", tierColor?.gradient, "text-black")
          : "bg-white/10 text-white/30"
      )}>
        {isEarned ? BADGE_ICONS[type] : <Lock className="h-5 w-5" />}
      </div>

      {/* Badge name */}
      <p className={cn(
        "text-xs font-medium mb-1",
        isEarned ? tierColor?.text : "text-white/50"
      )}>
        {BADGE_NAMES[type]}
      </p>

      {/* Tier indicator */}
      {isEarned && (
        <p className={cn("text-[10px] uppercase tracking-wider", tierColor?.text)}>
          {tier}
        </p>
      )}

      {/* Progress indicator */}
      {showProgress && progress && !isEarned && progress.nextRequirement && (
        <div className="mt-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/30 rounded-full transition-all"
              style={{ width: `${progress.percentToNext}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40 mt-1">
            {progress.currentProgress}/{progress.nextRequirement}
          </p>
        </div>
      )}

      {/* Progress for next tier */}
      {showProgress && progress && isEarned && progress.nextTier && progress.nextRequirement && (
        <div className="mt-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", tierColor?.bg?.replace('/30', '/60'))}
              style={{ width: `${progress.percentToNext}%` }}
            />
          </div>
          <p className="text-[10px] text-white/40 mt-1">
            {progress.currentProgress}/{progress.nextRequirement} to {progress.nextTier}
          </p>
        </div>
      )}

      {/* All tiers earned indicator */}
      {isEarned && tier === "gold" && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
          <span className="text-[10px]">✓</span>
        </div>
      )}
    </div>
  );
}

function getHighestTier(badges: UserBadge[]): BadgeTier | null {
  if (badges.some(b => b.tier === "gold")) return "gold";
  if (badges.some(b => b.tier === "silver")) return "silver";
  if (badges.some(b => b.tier === "bronze")) return "bronze";
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
