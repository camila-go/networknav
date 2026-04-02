"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { MatchWithUser, Commonality } from "@/types";
import { buildPersonalizedConversationStarters } from "@/lib/conversation-starters";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Zap, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamsActionButtons } from "@/components/network/teams-action-buttons";
import { logExplorePassClick } from "@/lib/log-network-action";

interface MatchCardProps {
  match: MatchWithUser;
  onPass: (id: string) => void;
  viewerFirstName?: string;
}

export function MatchCard({ match, onPass, viewerFirstName }: MatchCardProps) {
  const [showAllCommonalities, setShowAllCommonalities] = useState(false);
  const { matchedUser, type, commonalities, score } = match;

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

  return (
    <div className="overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300">
      {/* Header with match type badge */}
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <Badge
            className={cn(
              "gap-1 font-medium border-0",
              type === "high-affinity"
                ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25"
                : "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/25"
            )}
          >
            {type === "high-affinity" ? (
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
                <AvatarImage src={matchedUser.profile.photoUrl} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0 pr-24">
              <Link href={profileUrl} className="hover:text-cyan-400 transition-colors">
                <h3 className="font-semibold text-lg text-white hover:text-cyan-400">
                  {matchedUser.profile.name}
                </h3>
              </Link>
              <p className="text-sm text-white/70">
                {matchedUser.profile.position}
              </p>
              {matchedUser.profile.company && (
                <p className="text-sm text-cyan-400">
                  {matchedUser.profile.company}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-4 space-y-4">
        {/* Commonalities */}
        <div>
          <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
            {type === "high-affinity" ? "What you share" : "Why connect"}
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

          {commonalities.length > 3 && (
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
                  +{commonalities.length - 3} more <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Conversation starters (personalized like Explore) */}
        {displayStarters.length > 0 && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-cyan-400">
              💬 Conversation starters
            </p>
            {displayStarters.slice(0, 2).map((line, i) => (
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
        )}

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
            <span className="font-medium text-white">{Math.round(score * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/5 p-4">
        {matchedUser.email ? (
          <TeamsActionButtons
            targetEmail={matchedUser.email}
            targetName={matchedUser.profile.name}
            targetUserId={match.matchedUserId}
            source="dashboard_match"
            onPass={() => onPass(match.id)}
            composeMessage={displayStarters[0]}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              logExplorePassClick({
                source: "dashboard_match",
                targetUserId: match.matchedUserId,
              });
              onPass(match.id);
            }}
            className="inline-flex w-full min-h-10 items-center justify-center gap-2 rounded-full border-2 border-white/20 bg-transparent px-4 text-sm font-semibold text-white/90 transition-colors hover:border-white/40 hover:bg-white/10"
          >
            <span>Pass</span>
            <X className="h-4 w-4 opacity-80 shrink-0" strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

