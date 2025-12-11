"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttendeeSearchResult } from "@/types";

interface AttendeeCardProps {
  attendee: AttendeeSearchResult;
  onRequestMeeting?: (userId: string) => void;
}

export function AttendeeCard({ attendee, onRequestMeeting }: AttendeeCardProps) {
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
    excellent: "bg-teal-500 text-white",
    good: "bg-primary text-white",
    moderate: "bg-amber-500 text-white",
    exploring: "bg-navy-200 text-navy-700",
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <CardContent className="p-0">
        {/* Top section with profile */}
        <div className="p-4 pb-3">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <Link href={`/user/${user.id}`}>
              <Avatar className="h-14 w-14 border-2 border-white shadow-md cursor-pointer group-hover:ring-2 group-hover:ring-primary/20 transition-all">
                <AvatarImage src={user.profile.photoUrl} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>

            {/* Name and info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/user/${user.id}`}>
                    <h3 className="font-semibold text-navy-900 truncate hover:text-primary transition-colors cursor-pointer">
                      {user.profile.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.profile.position}
                  </p>
                  {user.profile.company && (
                    <p className="text-sm text-primary truncate">
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
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
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
              <Badge variant="outline" className="text-xs bg-navy-50">
                {formatLevel(questionnaire.leadershipLevel)}
              </Badge>
            )}
            {questionnaire.industry && (
              <Badge variant="outline" className="text-xs bg-navy-50">
                {formatIndustry(questionnaire.industry)}
              </Badge>
            )}
            {questionnaire.organizationSize && (
              <Badge variant="outline" className="text-xs bg-navy-50">
                {formatOrgSize(questionnaire.organizationSize)}
              </Badge>
            )}
          </div>
        )}

        {/* Commonalities */}
        {topCommonalities.length > 0 && (
          <div className="px-4 pb-3 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              What you have in common
            </p>
            <ul className="space-y-1">
              {topCommonalities.slice(0, 3).map((commonality, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-navy-700"
                >
                  <span className="text-primary mt-0.5 flex-shrink-0">
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
        <div className="px-4 py-3 border-t bg-navy-50/30">
          <Button
            onClick={() => onRequestMeeting?.(user.id)}
            size="sm"
            className="w-full gap-2"
          >
            <Calendar className="h-4 w-4" />
            Request Meeting
          </Button>
        </div>
      </CardContent>
    </Card>
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

