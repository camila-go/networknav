"use client";

import { useState } from "react";
import Link from "next/link";
import type { MatchWithUser } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sparkles,
  Zap,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MeetingRequestModal } from "@/components/meetings/meeting-request-modal";

interface MatchCardProps {
  match: MatchWithUser;
  onPass: (id: string) => void;
  onConnect: (id: string) => void;
}

export function MatchCard({ match, onPass, onConnect }: MatchCardProps) {
  const [showAllCommonalities, setShowAllCommonalities] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const { matchedUser, type, commonalities, conversationStarters, score } = match;

  const displayedCommonalities = showAllCommonalities
    ? commonalities
    : commonalities.slice(0, 3);

  const initials = matchedUser.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const profileUrl = `/user/${match.matchedUserId}`;

  function handleRequestMeeting() {
    setShowMeetingModal(true);
  }

  function handleMeetingSuccess() {
    onConnect(match.id);
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300">
      {/* Header with match type badge */}
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <Badge
            variant={type === "high-affinity" ? "default" : "secondary"}
            className={cn(
              "gap-1",
              type === "high-affinity"
                ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-black border-0"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
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
            <div className="flex-1 min-w-0">
              <Link href={profileUrl} className="hover:text-cyan-400 transition-colors">
                <h3 className="font-semibold text-lg text-white truncate hover:text-cyan-400">
                  {matchedUser.profile.name}
                </h3>
              </Link>
              <p className="text-sm text-white/70 truncate">
                {matchedUser.profile.position}
              </p>
              {matchedUser.profile.company && (
                <p className="text-sm text-cyan-400 truncate">
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

        {/* Conversation starter */}
        {conversationStarters.length > 0 && (
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
            <p className="text-xs font-medium text-cyan-400 mb-1">
              💬 Conversation starter
            </p>
            <p className="text-sm text-white/80">{conversationStarters[0]}</p>
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

      <div className="border-t border-white/10 bg-white/5 flex gap-2 p-4">
        <button
          onClick={() => onPass(match.id)}
          className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
          Pass
        </button>
        <button
          onClick={handleRequestMeeting}
          className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Request Meeting
        </button>
      </div>

      {/* Meeting Request Modal */}
      <MeetingRequestModal
        open={showMeetingModal}
        onOpenChange={setShowMeetingModal}
        recipient={matchedUser}
        commonalities={commonalities}
        conversationStarters={conversationStarters}
        onSuccess={handleMeetingSuccess}
      />
    </div>
  );
}

