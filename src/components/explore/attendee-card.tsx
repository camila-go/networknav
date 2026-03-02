"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Sparkles, Zap, MessageCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendeeSearchResult } from "@/types";
import { MeetingRequestModal } from "@/components/meetings/meeting-request-modal";

interface AttendeeCardProps {
  attendee: AttendeeSearchResult;
  onRequestMeeting?: (userId: string) => void;
  onPass?: (userId: string) => void;
}

export function AttendeeCard({ attendee, onRequestMeeting, onPass }: AttendeeCardProps) {
  const router = useRouter();
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showAllCommonalities, setShowAllCommonalities] = useState(false);
  const { user, matchPercentage, topCommonalities } = attendee;

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

  // Generate a conversation starter based on commonalities
  const conversationStarter = topCommonalities.length > 0
    ? `I'd love to get your take on this from your vantage point`
    : `Would be great to connect and learn from each other`;

  const profileUrl = `/user/${user.id}`;

  function handleMessage() {
    router.push(`/messages?userId=${user.id}&name=${encodeURIComponent(user.profile.name)}`);
  }

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

        {/* Conversation starter */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
          <p className="text-xs font-medium text-cyan-400 mb-1">
            💬 Conversation starter
          </p>
          <p className="text-sm text-white/80">{conversationStarter}</p>
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

      <div className="border-t border-white/10 bg-white/5 flex gap-2 p-4">
        {onPass && (
          <button
            onClick={() => onPass(user.id)}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
            Pass
          </button>
        )}
        <button
          onClick={handleMessage}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Message
        </button>
        <button
          onClick={() => setShowMeetingModal(true)}
          className="flex-1 inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Meet
        </button>
      </div>

      {/* Meeting Request Modal */}
      <MeetingRequestModal
        open={showMeetingModal}
        onOpenChange={setShowMeetingModal}
        recipient={user}
        commonalities={topCommonalities}
        onSuccess={() => onRequestMeeting?.(user.id)}
      />
    </div>
  );
}
