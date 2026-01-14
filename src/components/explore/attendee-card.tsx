"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendeeSearchResult } from "@/types";
import { MeetingRequestModal } from "@/components/meetings/meeting-request-modal";

interface AttendeeCardProps {
  attendee: AttendeeSearchResult;
  onRequestMeeting?: (userId: string) => void;
}

export function AttendeeCard({ attendee, onRequestMeeting }: AttendeeCardProps) {
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const { user, matchPercentage, topCommonalities, questionnaire } = attendee;

  const initials = user.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Determine match quality for visual indicator
  const matchQuality =
    matchPercentage >= 70
      ? "excellent"
      : matchPercentage >= 50
      ? "good"
      : matchPercentage >= 30
      ? "moderate"
      : "exploring";

  const matchColors = {
    excellent: "bg-gradient-to-r from-cyan-500 to-teal-500 text-black",
    good: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
    moderate: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    exploring: "bg-white/10 text-white/70 border border-white/20",
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 group">
      {/* Top section with profile */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Link href={`/user/${user.id}`}>
            <Avatar className="h-14 w-14 border-2 border-white/20 shadow-md cursor-pointer group-hover:ring-2 group-hover:ring-cyan-500/50 transition-all">
              <AvatarImage src={user.profile.photoUrl} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>

          {/* Name and info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/user/${user.id}`}>
                  <h3 className="font-semibold text-white truncate hover:text-cyan-400 transition-colors cursor-pointer">
                    {user.profile.name}
                  </h3>
                </Link>
                <p className="text-sm text-white/60 truncate">
                  {user.profile.position}
                </p>
                {user.profile.company && (
                  <p className="text-sm text-cyan-400 truncate">
                    {user.profile.company}
                  </p>
                )}
              </div>

              {/* Match percentage badge */}
              <Badge
                className={cn(
                  "flex-shrink-0 text-xs font-bold",
                  matchColors[matchQuality]
                )}
              >
                {matchPercentage}%
              </Badge>
            </div>

            {/* Location */}
            {user.profile.location && (
              <div className="flex items-center gap-1 mt-1 text-xs text-white/50">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{user.profile.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick info tags */}
      {questionnaire && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {questionnaire.leadershipLevel && (
            <Badge variant="outline" className="text-xs bg-white/5 border-white/20 text-white/70">
              {formatLevel(questionnaire.leadershipLevel)}
            </Badge>
          )}
          {questionnaire.industry && (
            <Badge variant="outline" className="text-xs bg-white/5 border-white/20 text-white/70">
              {formatIndustry(questionnaire.industry)}
            </Badge>
          )}
          {questionnaire.organizationSize && (
            <Badge variant="outline" className="text-xs bg-white/5 border-white/20 text-white/70">
              {formatOrgSize(questionnaire.organizationSize)}
            </Badge>
          )}
        </div>
      )}

      {/* Commonalities */}
      {topCommonalities.length > 0 && (
        <div className="px-4 pb-3 border-t border-white/10 pt-3">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
            What you have in common
          </p>
          <ul className="space-y-1">
            {topCommonalities.slice(0, 3).map((commonality, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-white/70"
              >
                <span className="mt-0.5 flex-shrink-0">
                  {commonality.category === "professional" && "💼"}
                  {commonality.category === "hobby" && "🎯"}
                  {commonality.category === "lifestyle" && "🌟"}
                  {commonality.category === "values" && "💡"}
                </span>
                <span className="line-clamp-1">{commonality.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action button */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/5">
        <Button
          onClick={() => setShowMeetingModal(true)}
          size="sm"
          className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400"
        >
          <Calendar className="h-4 w-4" />
          Request Meeting
        </Button>
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

// Helper functions to format labels
function formatLevel(level: string): string {
  const levels: Record<string, string> = {
    "c-suite": "C-Suite",
    "senior-executive": "Senior Exec",
    vp: "VP",
    director: "Director",
    manager: "Manager",
    emerging: "Emerging",
    founder: "Founder",
  };
  return levels[level] || level;
}

function formatIndustry(industry: string): string {
  const industries: Record<string, string> = {
    technology: "Tech",
    finance: "Finance",
    healthcare: "Healthcare",
    education: "Education",
    nonprofit: "Non-profit",
    manufacturing: "Manufacturing",
    retail: "Retail",
    "professional-services": "Prof. Services",
    government: "Government",
    consulting: "Consulting",
    media: "Media",
    "real-estate": "Real Estate",
    energy: "Energy",
    transportation: "Logistics",
    hospitality: "Hospitality",
    agriculture: "Agriculture",
  };
  return industries[industry] || industry;
}

function formatOrgSize(size: string): string {
  const sizes: Record<string, string> = {
    startup: "Startup",
    small: "Small",
    "mid-size": "Mid-size",
    large: "Large",
    enterprise: "Enterprise",
    solo: "Solo",
  };
  return sizes[size] || size;
}
