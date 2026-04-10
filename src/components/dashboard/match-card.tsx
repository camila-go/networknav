"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { MatchWithUser, Commonality } from "@/types";
import { buildPersonalizedConversationStarters } from "@/lib/conversation-starters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamsActionButtons } from "@/components/network/teams-action-buttons";
import { logExplorePassClick } from "@/lib/log-network-action";

export const mutedLabelClass =
  "text-[10px] font-normal uppercase tracking-normal text-[#757575]";

/** Aligns conversation starter rows with the match-strength label column */
export const SECTION_LABEL_COL = "w-[100px] shrink-0 text-left leading-tight";
export const SCORE_COL = "w-9 shrink-0 text-right tabular-nums";

/** Figma: category pill top-right — teal `#1b8ea6` (high affinity), orange `#ed7e35` (strategic) */
export const MATCH_TYPE_CHIP_HA = "bg-[#1b8ea6]";
export const MATCH_TYPE_CHIP_STRATEGIC = "bg-[#ed7e35]";

export function MatchTypeChip({ type }: { type: MatchWithUser["type"] }) {
  const isHighAffinity = type === "high-affinity";
  return (
    <div
      className={cn(
        "flex h-[29px] shrink-0 items-center justify-center rounded-xl px-3",
        isHighAffinity
          ? cn(MATCH_TYPE_CHIP_HA, "min-w-[8rem]")
          : cn(MATCH_TYPE_CHIP_STRATEGIC, "min-w-[6.25rem]")
      )}
    >
      <span className="text-center text-xs font-medium uppercase tracking-normal text-white">
        {isHighAffinity ? "HIGH AFFINITY" : "STRATEGIC"}
      </span>
    </div>
  );
}

export const matchCardPassChatClasses = {
  footer:
    "flex min-h-[72px] w-full min-w-0 flex-nowrap items-center gap-2 sm:gap-3 py-2.5",
  pass: cn(
    "!h-10 min-h-10 flex-1 basis-0 min-w-[117px] rounded-[30px] !border !border-solid !border-[#343434] !bg-transparent px-3 text-base font-bold text-white hover:!border-[#343434] hover:!bg-white/5 hover:!text-white gap-1.5 !shadow-none"
  ),
  chat: cn(
    "!h-10 min-h-10 min-w-0 flex-1 basis-0 rounded-[30px] !border-0 !bg-[#29606f] !px-2.5 sm:!px-3 text-sm sm:text-base font-bold text-white shadow-none",
    "hover:!bg-[#34788a] hover:!border-0 hover:shadow-none",
    "active:!bg-[#245560] focus-visible:!ring-2 focus-visible:!ring-white/40 focus-visible:!ring-offset-2 focus-visible:!ring-offset-[#191919]"
  ),
};

interface MatchCardProps {
  match: MatchWithUser;
  onPass: (id: string) => void;
  viewerFirstName?: string;
  /** Fixed-height carousel slides: middle content scrolls */
  variant?: "grid" | "carousel";
}

export function MatchCard({
  match,
  onPass,
  viewerFirstName,
  variant = "grid",
}: MatchCardProps) {
  const [showAllCommonalities, setShowAllCommonalities] = useState(false);
  const { matchedUser, type, commonalities, score } = match;

  const isHighAffinity = type === "high-affinity";

  const displayStarters = useMemo(() => {
    const coms: Commonality[] =
      commonalities.length > 0
        ? commonalities
        : [
            {
              category: "professional",
              description:
                matchedUser.profile.position && matchedUser.profile.company
                  ? `${matchedUser.profile.position} at ${matchedUser.profile.company}`
                  : matchedUser.profile.position || "Fellow attendee",
              weight: 0.6,
            },
          ];
    return buildPersonalizedConversationStarters(
      coms,
      type,
      matchedUser.profile.name.split(/\s+/)[0],
      {
        theirPosition: matchedUser.profile.position,
        theirCompany: matchedUser.profile.company ?? undefined,
        viewerFirstName,
        seed: `${match.userId}-${match.matchedUserId}`,
      }
    );
  }, [
    commonalities,
    type,
    matchedUser.profile.name,
    matchedUser.profile.position,
    matchedUser.profile.company,
    viewerFirstName,
    match.userId,
    match.matchedUserId,
  ]);

  const displayedCommonalities = showAllCommonalities
    ? commonalities
    : commonalities.slice(0, 3);

  const initials = matchedUser.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const profileUrl = `/user/${match.matchedUserId}`;

  const title = matchedUser.profile.title?.trim();
  const position = matchedUser.profile.position?.trim();
  const teamPositionLine =
    title && position ? `${title} | ${position}` : position || title || "";

  const scorePercent = Math.round((score > 1 ? score : score * 100));
  const barWidth = `${Math.min(100, Math.max(0, scorePercent))}%`;

  const isCarousel = variant === "carousel";

  return (
    <div
      className={cn(
        "flex flex-col rounded-[20px] border border-[#262626] bg-[#0d0d0d] transition-colors duration-300",
        "hover:border-[#333333]",
        isCarousel
          ? "h-full min-h-0 flex-1 overflow-hidden"
          : "min-h-[420px] h-full flex-1"
      )}
    >
      {/* Figma: chip top-right, then avatar row (rounded pill, not full-width cap) */}
      <div className="shrink-0 px-4 pb-3 pt-[11px]">
        <div className="flex w-full flex-col items-end gap-[11px]">
          <MatchTypeChip type={type} />
          <div className="flex w-full items-center gap-5">
            <Link href={profileUrl} className="shrink-0">
              <Avatar className="h-[65px] w-[65px] border-0 shadow-none ring-0 cursor-pointer transition-opacity hover:opacity-95">
                <AvatarImage src={matchedUser.profile.photoUrl} />
                <AvatarFallback
                  className={cn(
                    "text-base font-bold text-[#0d0d0d]",
                    isHighAffinity ? MATCH_TYPE_CHIP_HA : MATCH_TYPE_CHIP_STRATEGIC
                  )}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1 text-left">
              <Link href={profileUrl} className="text-white hover:opacity-90">
                <h3 className="text-xl font-bold leading-tight text-white">
                  {matchedUser.profile.name}
                </h3>
              </Link>
              {teamPositionLine && (
                <p className="mt-1 text-base font-normal leading-snug text-white">
                  {teamPositionLine}
                </p>
              )}
              {matchedUser.profile.company && (
                <p className="mt-[5px] text-xs font-normal uppercase tracking-normal text-white">
                  {matchedUser.profile.company}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-[13px] px-4 pb-4",
          isCarousel &&
            "touch-pan-y overflow-y-auto overscroll-y-contain"
        )}
        style={isCarousel ? { WebkitOverflowScrolling: "touch" } : undefined}
      >
        {/* Why connect */}
        <div>
          <h4 className={cn(mutedLabelClass, "mb-0 w-[100px] max-w-full")}>
            Why connect
          </h4>
          <ul className="mt-1 space-y-2">
            {displayedCommonalities.map((commonality, index) => (
              <li
                key={index}
                className="text-sm font-normal leading-normal text-white"
              >
                {commonality.description}
              </li>
            ))}
          </ul>

          {commonalities.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllCommonalities(!showAllCommonalities)}
              className="mt-2 flex items-center gap-1 text-xs font-medium text-[#62d0ea] transition-colors hover:text-[#7edcf0] hover:underline"
            >
              {showAllCommonalities ? (
                <>
                  Show less <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  +{commonalities.length - 3} more <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Conversation starters — Figma: stacked label above body, full width, 12px gap between blocks */}
        {displayStarters.length > 0 && (
          <div className="w-full rounded-[12px] bg-[#141e21] p-3">
            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full min-w-0 flex-col items-stretch gap-1">
                <p className="w-full text-[10px] font-normal uppercase tracking-normal text-[#62d0ea]">
                  Conversation starter
                </p>
                <p className="w-full min-w-0 text-xs font-normal leading-relaxed text-white">
                  {displayStarters[0]}
                </p>
              </div>
              {displayStarters.length > 1 && (
                <div className="flex w-full min-w-0 flex-col items-stretch gap-1">
                  <p className="w-full text-[10px] font-normal uppercase tracking-normal text-[#757575]">
                    Also try
                  </p>
                  <p className="w-full min-w-0 text-xs font-normal leading-relaxed text-white">
                    {displayStarters[1]}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match strength — Figma: label + bar cluster + percent */}
        <div className="flex w-full min-w-0 items-center gap-3">
          <span className={cn(SECTION_LABEL_COL, mutedLabelClass, "shrink-0")}>
            Match strength
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="h-2 min-h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-[#4a9ba4] transition-all"
                style={{ width: barWidth }}
              />
            </div>
            <span
              className={cn(
                SCORE_COL,
                "shrink-0 text-[10px] font-normal text-[#fffdfd]"
              )}
            >
              {scorePercent}%
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 bg-[#191919] px-3 sm:px-4">
        {matchedUser.email ? (
          <TeamsActionButtons
            targetEmail={matchedUser.email}
            targetName={matchedUser.profile.name}
            targetUserId={match.matchedUserId}
            source="dashboard_match"
            onPass={() => onPass(match.id)}
            composeMessage={displayStarters[0]}
            className={matchCardPassChatClasses.footer}
            passClassName={matchCardPassChatClasses.pass}
            chatClassName={matchCardPassChatClasses.chat}
          />
        ) : (
          <div className={matchCardPassChatClasses.footer}>
            <button
              type="button"
              onClick={() => {
                logExplorePassClick({
                  source: "dashboard_match",
                  targetUserId: match.matchedUserId,
                });
                onPass(match.id);
              }}
              className={cn(
                "inline-flex h-10 min-h-10 w-full min-w-[117px] flex-1 items-center justify-center gap-1.5 rounded-[30px] border border-solid border-[#343434] bg-transparent px-3 text-base font-bold text-white transition-colors hover:bg-white/5"
              )}
            >
              <span>Pass</span>
              <X className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
