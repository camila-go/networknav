"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Zap, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamsActionButtons } from "@/components/network/teams-action-buttons";
import { logExplorePassClick } from "@/lib/log-network-action";
import type { AttendeeSearchResult, Commonality } from "@/types";
import { buildPersonalizedConversationStarters } from "@/lib/conversation-starters";

interface AttendeeCardProps {
  attendee: AttendeeSearchResult;
  onRequestMeeting?: (userId: string) => void;
  onPass?: (userId: string) => void;
  viewerFirstName?: string;
}

export function AttendeeCard({ attendee, onPass, viewerFirstName }: AttendeeCardProps) {
  const [showAllCommonalities, setShowAllCommonalities] = useState(false);
  const { user, matchPercentage, topCommonalities, searchMatchLabels } =
    attendee;

  const initials = user.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Determine match type based on percentage
  const matchType = matchPercentage >= 60 ? "high-affinity" : "strategic";
  const score = matchPercentage / 100;

  const displayedCommonalities = showAllCommonalities
    ? topCommonalities
    : topCommonalities.slice(0, 3);

  const commonalitiesForStarters: Commonality[] =
    topCommonalities.length > 0
      ? topCommonalities
      : [
          {
            category: "professional",
            description:
              user.profile.position && user.profile.company
                ? `${user.profile.position} at ${user.profile.company}`
                : user.profile.position
                  ? user.profile.position
                  : "Fellow attendee",
            weight: 0.6,
          },
        ];
  const starters = buildPersonalizedConversationStarters(
    commonalitiesForStarters,
    matchType,
    user.profile.name.split(/\s+/)[0],
    {
      theirPosition: user.profile.position,
      theirCompany: user.profile.company ?? undefined,
      viewerFirstName,
      seed: `${user.id}-explore`,
    }
  );

  const profileUrl = `/user/${user.id}`;

  return (
    <div className="overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300">
      {/* Header with match type badge */}
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <Badge
            className={cn(
              "gap-1 font-medium border-0",
              matchType === "high-affinity"
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25"
                : "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/25"
            )}
          >
            {matchType === "high-affinity" ? (
              <>
                <Sparkles className="h-3 w-3" />
                High-Affinity
              </>
            ) : (
              <>
                <Zap className="h-3 w-3" />
                Strategic
              </>
            )}
          </Badge>
        </div>

        {/* Profile section - clickable */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <Link href={profileUrl} className="flex-shrink-0">
              <Avatar className="h-16 w-16 border-2 border-white/20 shadow-md cursor-pointer hover:ring-2 hover:ring-cyan-500 hover:ring-offset-2 hover:ring-offset-black transition-all">
                <AvatarImage src={user.profile.photoUrl} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0 pr-24">
              <Link href={profileUrl} className="hover:text-cyan-400 transition-colors">
                <h3 className="font-semibold text-lg text-white hover:text-cyan-400">
                  {user.profile.name}
                </h3>
              </Link>
              <p className="text-sm text-white/70">
                {user.profile.position}
              </p>
              {user.profile.company && (
                <p className="text-sm text-cyan-400">
                  {user.profile.company}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-4 space-y-4">
        {searchMatchLabels && searchMatchLabels.length > 0 && (
          <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-cyan-400/90 mb-1">
              Matches your search
            </p>
            <p className="text-sm text-white/90">
              {searchMatchLabels.join(" · ")}
            </p>
          </div>
        )}
        {/* Commonalities */}
        {topCommonalities.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
              {matchType === "high-affinity" ? "What you share" : "Why connect"}
            </h4>
            <ul className="space-y-1.5">
              {displayedCommonalities.map((commonality, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-white/80"
                >
                  <span className="mt-0.5">
                    {commonality.category === "professional" && "💼"}
                    {commonality.category === "hobby" && "🎯"}
                    {commonality.category === "lifestyle" && "🌟"}
                    {commonality.category === "values" && "💡"}
                  </span>
                  <span>{commonality.description}</span>
                </li>
              ))}
            </ul>

            {topCommonalities.length > 3 && (
              <button
                onClick={() => setShowAllCommonalities(!showAllCommonalities)}
                className="mt-2 text-xs text-cyan-400 hover:underline flex items-center gap-1"
              >
                {showAllCommonalities ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    +{topCommonalities.length - 3} more <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Conversation starters */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-cyan-400">
            💬 Conversation starters
          </p>
          {starters.slice(0, 2).map((line, i) => (
            <p key={i} className="text-sm text-white/80 leading-relaxed">
              {i === 1 && (
                <span className="text-white/40 text-[10px] uppercase tracking-wide block mb-0.5">
                  Also try
                </span>
              )}
              {line}
            </p>
          ))}
        </div>

        {/* Match score */}
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Match strength</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                style={{ width: `${score * 100}%` }}
              />
            </div>
            <span className="font-medium text-white">{matchPercentage}%</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/5 p-4">
        {user.email ? (
          <TeamsActionButtons
            targetEmail={user.email}
            targetName={user.profile.name}
            targetUserId={user.id}
            source="explore_search"
            onPass={onPass ? () => onPass(user.id) : undefined}
            showPass={Boolean(onPass)}
          />
        ) : (
          onPass && (
            <button
              type="button"
              onClick={() => {
                logExplorePassClick({
                  source: "explore_search",
                  targetUserId: user.id,
                });
                onPass(user.id);
              }}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors w-full"
            >
              <span>Pass</span>
              <X className="h-4 w-4 opacity-70" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
