"use client";

import { useState } from "react";
import type { MatchWithUser } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sparkles,
  Zap,
  MessageCircle,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: MatchWithUser;
  onPass: (id: string) => void;
  onConnect: (id: string) => void;
}

export function MatchCard({ match, onPass, onConnect }: MatchCardProps) {
  const [showAllCommonalities, setShowAllCommonalities] = useState(false);
  const { matchedUser, type, commonalities, conversationStarters, score } = match;

  const displayedCommonalities = showAllCommonalities
    ? commonalities
    : commonalities.slice(0, 3);

  const initials = matchedUser.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Header with match type badge */}
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <Badge
            variant={type === "high-affinity" ? "default" : "secondary"}
            className={cn(
              "gap-1",
              type === "high-affinity"
                ? "bg-primary/90"
                : "bg-coral-100 text-coral-700"
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

        {/* Profile section */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-white shadow-md">
              <AvatarImage src={matchedUser.profile.photoUrl} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-navy-900 truncate">
                {matchedUser.profile.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {matchedUser.profile.position}
              </p>
              {matchedUser.profile.company && (
                <p className="text-sm text-primary truncate">
                  {matchedUser.profile.company}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="pt-0 space-y-4">
        {/* Commonalities */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {type === "high-affinity" ? "What you share" : "Why connect"}
          </h4>
          <ul className="space-y-1.5">
            {displayedCommonalities.map((commonality, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-navy-700"
              >
                <span className="text-primary mt-0.5">
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
              className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
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
          <div className="bg-primary/5 rounded-lg p-3">
            <p className="text-xs font-medium text-primary mb-1">
              💬 Conversation starter
            </p>
            <p className="text-sm text-navy-700">{conversationStarters[0]}</p>
          </div>
        )}

        {/* Match score */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Match strength</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-navy-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-teal-500 rounded-full"
                style={{ width: `${score * 100}%` }}
              />
            </div>
            <span className="font-medium">{Math.round(score * 100)}%</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t bg-navy-50/50 gap-2 p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPass(match.id)}
          className="flex-1 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4 mr-1" />
          Pass
        </Button>
        <Button
          size="sm"
          onClick={() => onConnect(match.id)}
          className="flex-1 gap-1"
        >
          <MessageCircle className="h-4 w-4" />
          Connect
        </Button>
      </CardFooter>
    </Card>
  );
}

