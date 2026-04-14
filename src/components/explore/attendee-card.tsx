"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { AttendeeSearchResult, Commonality } from "@/types";
import { buildPersonalizedConversationStarters } from "@/lib/conversation-starters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamsActionButtons } from "@/components/network/teams-action-buttons";
import { logExplorePassClick } from "@/lib/log-network-action";
import {
  mutedLabelClass,
  SECTION_LABEL_COL,
  SCORE_COL,
  matchCardPassChatClasses,
  MatchTypeChip,
  MATCH_TYPE_CHIP_HA,
  MATCH_TYPE_CHIP_STRATEGIC,
} from "@/components/dashboard/match-card";

/** Search cards use this for the teal “HIGH AFFINITY” cap (aligned with dashboard match semantics). */
export const EXPLORE_HIGH_AFFINITY_MIN_PERCENT = 50;

interface AttendeeCardProps {
  attendee: AttendeeSearchResult;
  onRequestMeeting?: (userId: string) => void;
  onPass?: (userId: string) => void;
  viewerFirstName?: string;
  variant?: "grid" | "carousel";
}

export function AttendeeCard({
  attendee,
  onPass,
  viewerFirstName,
  variant = "grid",
}: AttendeeCardProps) {
  const [showAllCommonalities, setShowAllCommonalities] = useState(false);
  const { user, matchPercentage, topCommonalities, searchMatchLabels } =
    attendee;

  const isHighAffinity =
    matchPercentage >= EXPLORE_HIGH_AFFINITY_MIN_PERCENT;
  const matchType = isHighAffinity ? "high-affinity" : "strategic";

  const initials = user.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const displayedCommonalities = showAllCommonalities
    ? topCommonalities
    : topCommonalities.slice(0, 3);

  const displayStarters = useMemo(() => {
    const coms: Commonality[] =
      topCommonalities.length > 0
        ? topCommonalities
        : [
            {
              category: "professional",
              description:
                user.profile.title && user.profile.company
                  ? `${user.profile.title} at ${user.profile.company}`
                  : user.profile.title
                    ? user.profile.title
                    : "Fellow attendee",
              weight: 0.6,
            },
          ];
    return buildPersonalizedConversationStarters(
      coms,
      matchType,
      user.profile.name.split(/\s+/)[0],
      {
        theirTitle: user.profile.title,
        theirCompany: user.profile.company ?? undefined,
        viewerFirstName,
        seed: `${user.id}-explore`,
      }
    );
  }, [
    topCommonalities,
    matchType,
    user.profile.name,
    user.profile.title,
    user.profile.company,
    viewerFirstName,
    user.id,
  ]);

  const profileUrl = `/user/${user.id}`;

  const title = user.profile.title?.trim() || "";
  const teamPositionLine = title;

  const scorePercent = Math.min(100, Math.max(0, Math.round(matchPercentage)));
  const barWidth = `${scorePercent}%`;

  const isCarousel = variant === "carousel";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[20px] border border-[#262626] bg-[#0d0d0d] transition-colors duration-300",
        "hover:border-[#333333]",
        isCarousel
          ? "h-full min-h-0 flex-1"
          : "min-h-[420px] h-full flex-1"
      )}
    >
      <div className="shrink-0 px-4 pb-3 pt-[11px]">
        <div className="flex w-full flex-col items-end gap-[11px]">
          <MatchTypeChip type={matchType} />
          <div className="flex w-full items-center gap-5">
            <Link href={profileUrl} className="shrink-0">
              <Avatar className="h-[65px] w-[65px] border-0 shadow-none ring-0 cursor-pointer transition-opacity hover:opacity-95">
                <AvatarImage src={user.profile.photoUrl} />
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
                  {user.profile.name}
                </h3>
              </Link>
              {teamPositionLine && (
                <p className="mt-1 text-base font-normal leading-snug text-white">
                  {teamPositionLine}
                </p>
              )}
              {user.profile.company && (
                <p className="mt-[5px] text-xs font-normal uppercase tracking-normal text-white">
                  {user.profile.company}
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
      >
        {searchMatchLabels && searchMatchLabels.length > 0 && (
          <div className="w-full rounded-[12px] bg-[#141e21] p-3">
            <div className="flex w-full min-w-0 flex-col items-stretch gap-1">
              <p className="w-full text-[10px] font-normal uppercase tracking-normal text-[#62d0ea]">
                Matches your search
              </p>
              <p className="w-full min-w-0 text-xs font-normal leading-relaxed text-white">
                {searchMatchLabels.join(" · ")}
              </p>
            </div>
          </div>
        )}

        {topCommonalities.length > 0 && (
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

            {topCommonalities.length > 3 && (
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
                    +{topCommonalities.length - 3} more{" "}
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

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

      <div className="shrink-0 bg-[#191919] px-4">
        {user.email ? (
          <TeamsActionButtons
            targetEmail={user.email}
            targetName={user.profile.name}
            targetUserId={user.id}
            source="explore_search"
            onPass={onPass ? () => onPass(user.id) : undefined}
            showPass={Boolean(onPass)}
            composeMessage={displayStarters[0]}
            className={matchCardPassChatClasses.footer}
            passClassName={matchCardPassChatClasses.pass}
            chatClassName={matchCardPassChatClasses.chat}
          />
        ) : (
          onPass && (
            <div className={matchCardPassChatClasses.footer}>
              <button
                type="button"
                onClick={() => {
                  logExplorePassClick({
                    source: "explore_search",
                    targetUserId: user.id,
                  });
                  onPass(user.id);
                }}
                className={cn(
                  "inline-flex h-10 min-h-10 w-full min-w-[117px] flex-1 items-center justify-center gap-1.5 rounded-[30px] border border-solid border-[#343434] bg-transparent px-3 text-base font-bold text-white transition-colors hover:bg-white/5"
                )}
              >
                <span>Pass</span>
                <X className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
