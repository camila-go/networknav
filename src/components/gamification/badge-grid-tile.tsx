"use client";

import { Calendar, Check, Filter, Flame, Lock, MessageCircle, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BadgeProgress } from "@/lib/gamification";
import type { BadgeType, BadgeTier } from "@/types";
import { BADGE_DEFINITIONS } from "@/types";
import { cn } from "@/lib/utils";

export const BADGE_TYPE_ORDER: BadgeType[] = [
  "conversation_starter",
  "super_connector",
  "meeting_master",
  "networking_streak",
  "weekly_warrior",
  "thoughtful_curator",
];

export const BADGE_NAMES: Record<BadgeType, string> = {
  conversation_starter: "Conversation Starter",
  super_connector: "Super Connector",
  meeting_master: "Meeting Master",
  networking_streak: "Networking Streak",
  weekly_warrior: "Weekly Warrior",
  thoughtful_curator: "Thoughtful Curator",
};

const ICONS: Record<BadgeType, LucideIcon> = {
  conversation_starter: MessageCircle,
  super_connector: Users,
  meeting_master: Calendar,
  networking_streak: Flame,
  weekly_warrior: Trophy,
  thoughtful_curator: Filter,
};

export function BadgeTypeIcon({
  type,
  className,
}: {
  type: BadgeType;
  className?: string;
}) {
  const I = ICONS[type];
  return <I className={className} strokeWidth={2} />;
}

/** Tier + locked visuals — shared across profile, public profile, and achievements modal */
export const BADGE_TIER_STYLES: Record<
  BadgeTier,
  { card: string; border: string; title: string; label: string; gradient: string; bar: string }
> = {
  bronze: {
    card: "bg-amber-950/25",
    border: "border-amber-600/50",
    title: "text-amber-400",
    label: "text-amber-500/90",
    gradient: "from-amber-500 to-orange-600",
    bar: "bg-amber-500/70",
  },
  silver: {
    card: "bg-slate-400/10",
    border: "border-slate-400/45",
    title: "text-slate-200",
    label: "text-slate-300/90",
    gradient: "from-slate-300 to-slate-100",
    bar: "bg-slate-300/70",
  },
  gold: {
    card: "bg-yellow-500/12",
    border: "border-yellow-500/45",
    title: "text-yellow-400",
    label: "text-yellow-300/90",
    gradient: "from-yellow-400 to-amber-500",
    bar: "bg-yellow-400/80",
  },
};

const LOCKED = {
  card: "bg-white/[0.03]",
  border: "border-white/10",
  iconWell: "bg-white/10",
  title: "text-white/45",
};

function goldRequirement(type: BadgeType): number {
  return BADGE_DEFINITIONS.find((d) => d.type === type)?.tiers.gold.requirement ?? 1;
}

export interface BadgeGridTileProps {
  type: BadgeType;
  /** Highest tier earned for this badge type (from `user_badges`) */
  tier: BadgeTier | null;
  progress?: BadgeProgress | null;
  layout: "compact" | "achievements";
  showProgress?: boolean;
}

export function BadgeGridTile({
  type,
  tier,
  progress,
  layout,
  showProgress = false,
}: BadgeGridTileProps) {
  const isEarned = tier !== null;
  /** Has activity toward first tier or next tier, but card reflects “not yet earned” for icon rules */
  const inProgress =
    !isEarned && !!progress && progress.currentProgress > 0;
  const tierStyle = tier ? BADGE_TIER_STYLES[tier] : null;
  const def = BADGE_DEFINITIONS.find((d) => d.type === type);
  const Icon = ICONS[type];

  const isMaxTier =
    progress?.currentTier === "gold" && progress.nextRequirement === null;

  const iconFrame =
    layout === "achievements" ? "h-16 w-16 mx-auto" : "w-12 h-12 mx-auto";
  const iconInner = layout === "achievements" ? "h-7 w-7" : "h-5 w-5";

  const numerator =
    progress?.nextRequirement != null
      ? Math.min(progress.currentProgress, progress.nextRequirement)
      : progress
        ? Math.min(progress.currentProgress, goldRequirement(type))
        : 0;
  const denominator = progress?.nextRequirement ?? (progress ? goldRequirement(type) : 0);

  const barPercentAchievements = isMaxTier
    ? 100
    : progress
      ? Math.max(0, Math.min(100, progress.percentToNext))
      : 0;

  const showAchievementFooter = layout === "achievements" && progress;
  const showCompactFooter =
    layout === "compact" && showProgress && progress && (progress.nextRequirement !== null || isEarned);

  return (
    <div
      className={cn(
        "relative rounded-xl border text-center transition-all duration-300",
        layout === "achievements" ? "p-4" : "p-3",
        isEarned
          ? cn(tierStyle?.card, tierStyle?.border)
          : inProgress
            ? "border border-amber-700/35 bg-amber-950/20"
            : cn(LOCKED.card, LOCKED.border, layout === "compact" && "opacity-[0.92]")
      )}
    >
      <div
        className={cn(
          iconFrame,
          "mb-2 flex shrink-0 items-center justify-center rounded-full border",
          isEarned
            ? cn("border-transparent bg-gradient-to-br text-black", tierStyle?.gradient)
            : inProgress
              ? "border-amber-600/45 bg-amber-900/40 text-amber-100"
              : cn(LOCKED.iconWell, "border-white/5 text-white/35")
        )}
      >
        {isEarned || inProgress ? (
          <Icon className={iconInner} strokeWidth={2} />
        ) : (
          <Lock className={cn(iconInner)} strokeWidth={2} />
        )}
      </div>

      <div className={cn("space-y-1", layout === "achievements" && "min-h-[3.25rem]")}>
        <div className="flex items-center justify-center gap-1.5">
          <p
            className={cn(
              layout === "achievements" ? "text-sm font-semibold" : "text-xs font-medium",
              isEarned ? tierStyle?.title : inProgress ? "text-amber-200/95" : LOCKED.title
            )}
          >
            {BADGE_NAMES[type]}
          </p>
          {layout === "achievements" && isMaxTier && (
            <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
        </div>

        {layout === "achievements" && def && (
          <p
            className={cn(
              "text-xs leading-snug",
              inProgress ? "text-amber-200/50" : "text-white/50"
            )}
          >
            {def.description}
          </p>
        )}

        {layout === "achievements" && inProgress && (
          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-400/80">
            In progress
          </p>
        )}

        {isEarned && (
          <p className={cn("text-[10px] uppercase tracking-wider", tierStyle?.label)}>
            {tier}
          </p>
        )}
      </div>

      {layout === "compact" && isEarned && tier === "gold" && (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500">
          <span className="text-[10px] text-black">✓</span>
        </div>
      )}

      {showCompactFooter && progress && (
        <div className="mt-2">
          {!isEarned && progress.nextRequirement && (
            <>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white/40 transition-all"
                  style={{ width: `${progress.percentToNext}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-white/40">
                {progress.currentProgress}/{progress.nextRequirement}
              </p>
            </>
          )}
          {isEarned && progress.nextTier && progress.nextRequirement && (
            <>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn("h-full rounded-full transition-all", tierStyle?.bar)}
                  style={{ width: `${progress.percentToNext}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-white/40">
                {progress.currentProgress}/{progress.nextRequirement} to {progress.nextTier}
              </p>
            </>
          )}
        </div>
      )}

      {showAchievementFooter && progress && (
        <div className="mt-4 space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isMaxTier && "bg-gradient-to-r from-emerald-400 to-teal-400",
                !isMaxTier &&
                  (isEarned || inProgress || progress.currentProgress > 0) &&
                  "bg-gradient-to-r from-violet-500 to-cyan-400",
                !isMaxTier && !isEarned && progress.currentProgress <= 0 && "bg-white/25"
              )}
              style={{ width: `${barPercentAchievements}%` }}
            />
          </div>
          <p className="text-right text-[11px] tabular-nums text-white/45">
            {numerator}/{denominator || 1}
            {progress.nextTier && !isMaxTier ? (
              <span className="text-white/30"> → {progress.nextTier}</span>
            ) : null}
          </p>
        </div>
      )}
    </div>
  );
}
