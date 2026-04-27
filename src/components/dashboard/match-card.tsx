"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { MatchWithUser, Commonality } from "@/types";
import { buildPersonalizedConversationStarters } from "@/lib/conversation-starters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X } from "lucide-react";
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
    "press !h-10 min-h-10 flex-1 basis-0 min-w-[117px] rounded-[30px] !border !border-solid !border-[#343434] !bg-transparent px-3 text-base font-bold text-white hover:!border-[#343434] hover:!bg-white/5 hover:!text-white gap-1.5 !shadow-none transition-colors"
  ),
  chat: cn(
    "press group !h-10 min-h-10 min-w-0 flex-1 basis-0 rounded-[30px] !border-0 !bg-[#29606f] !px-2.5 sm:!px-3 text-sm sm:text-base font-bold text-white shadow-none transition-colors",
    "hover:!bg-[#34788a] hover:!border-0 hover:shadow-none hover:shadow-[0_0_0_2px_rgba(98,208,234,0.18)]",
    "active:!bg-[#245560] focus-visible:!ring-2 focus-visible:!ring-white/40 focus-visible:!ring-offset-2 focus-visible:!ring-offset-[#191919]"
  ),
};

interface MatchCardProps {
  match: MatchWithUser;
  onPass: (id: string) => void;
  viewerFirstName?: string;
  /** Fixed-height carousel slides: header and body scroll together above the footer */
  variant?: "grid" | "carousel";
}

export function MatchCard({
  match,
  onPass,
  viewerFirstName,
  variant = "grid",
}: MatchCardProps) {
  const { matchedUser, type, commonalities, score } = match;

  const isHighAffinity = type === "high-affinity";

  const displayStarters = useMemo(() => {
    if (match.conversationStarters?.length) {
      return match.conversationStarters;
    }
    const coms: Commonality[] =
      commonalities.length > 0
        ? commonalities
        : [
            {
              category: "professional",
              description:
                matchedUser.profile.title && matchedUser.profile.company
                  ? `${matchedUser.profile.title} at ${matchedUser.profile.company}`
                  : matchedUser.profile.title || "Fellow attendee",
              weight: 0.6,
            },
          ];
    return buildPersonalizedConversationStarters(
      coms,
      type,
      matchedUser.profile.name.split(/\s+/)[0],
      {
        theirTitle: matchedUser.profile.title,
        theirCompany: matchedUser.profile.company ?? undefined,
        viewerFirstName,
        seed: `${match.userId}-${match.matchedUserId}`,
      }
    );
  }, [
    match.conversationStarters,
    commonalities,
    type,
    matchedUser.profile.name,
    matchedUser.profile.title,
    matchedUser.profile.company,
    viewerFirstName,
    match.userId,
    match.matchedUserId,
  ]);

  const topCommonality = commonalities[0];

  const initials = matchedUser.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const profileUrl = `/user/${match.matchedUserId}`;

  const title = matchedUser.profile.title?.trim() || "";
  const teamPositionLine = title;

  const scorePercent = Math.round((score > 1 ? score : score * 100));
  const barWidth = `${Math.min(100, Math.max(0, scorePercent))}%`;

  const isCarousel = variant === "carousel";

  return (
    <div
      className={cn(
        "group/matchcard hover-lift flex flex-col rounded-[20px] border border-[#262626] bg-[#0d0d0d]",
        "hover:border-[#3a3a3a]",
        isCarousel
          ? "h-full min-h-0 flex-1 overflow-hidden"
          : "min-h-[420px] h-full flex-1 overflow-hidden"
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain",
          isCarousel ? "touch-auto" : "touch-pan-y"
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Figma: chip top-right, then avatar row (rounded pill, not full-width cap) */}
        <div className="shrink-0 px-4 pb-3 pt-[11px]">
          <div className="flex w-full flex-col items-end gap-[11px]">
            <MatchTypeChip type={type} />
            <div className="flex w-full items-center gap-5">
              <Link href={profileUrl} className="shrink-0">
                <Avatar className="h-[65px] w-[65px] border-0 shadow-none ring-0 cursor-pointer transition-transform duration-300 ease-out hover:scale-[1.04] group-hover/matchcard:ring-2 group-hover/matchcard:ring-white/10">
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

        <div className="flex min-h-0 flex-1 flex-col gap-[13px] px-4 pb-4">
        {/* Why connect */}
        {topCommonality && (
          <div>
            <h4 className={cn(mutedLabelClass, "mb-0 w-[100px] max-w-full")}>
              Why connect
            </h4>
            <p
              className="mt-1 truncate text-sm font-normal leading-normal text-white"
              title={topCommonality.description}
            >
              {topCommonality.description}
            </p>
          </div>
        )}

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
                className="animate-score-fill h-full rounded-full bg-[#4a9ba4] transition-[width] duration-500 ease-out"
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
                "press group inline-flex h-10 min-h-10 w-full min-w-[117px] flex-1 items-center justify-center gap-1.5 rounded-[30px] border border-solid border-[#343434] bg-transparent px-3 text-base font-bold text-white transition-colors hover:bg-white/5"
              )}
            >
              <span>Pass</span>
              <X
                className="h-4 w-4 shrink-0 opacity-90 transition-transform duration-200 ease-out group-hover:rotate-90 group-hover:opacity-100"
                strokeWidth={2.5}
                aria-hidden
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
