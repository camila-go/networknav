"use client";

import { useState } from "react";
import { Flame, Snowflake, Calendar, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StreakStatus } from "@/types";
import { cn } from "@/lib/utils";

interface StreakCardProps {
  streaks: StreakStatus;
  onFreezeStreak?: () => Promise<void>;
}

export function StreakCard({ streaks, onFreezeStreak }: StreakCardProps) {
  const [isFreezing, setIsFreezing] = useState(false);

  const handleFreeze = async () => {
    if (!onFreezeStreak) return;
    setIsFreezing(true);
    try {
      await onFreezeStreak();
    } finally {
      setIsFreezing(false);
    }
  };

  const { daily, weekly } = streaks;
  const dailyStreak = daily.current;
  const weeklyStreak = weekly.current;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-400" />
        Your Streaks
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Daily Streak */}
        <div className={cn(
          "rounded-xl p-4 border transition-all",
          dailyStreak > 0 
            ? "bg-gradient-to-br from-orange-500/20 to-red-500/10 border-orange-500/30" 
            : "bg-white/5 border-white/10"
        )}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-2 rounded-lg",
                dailyStreak > 0 
                  ? "bg-gradient-to-br from-orange-500 to-red-500 text-white" 
                  : "bg-white/10 text-white/50"
              )}>
                <Flame className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-white/80">Daily Streak</span>
            </div>
            {daily.freezeAvailable && dailyStreak > 0 && onFreezeStreak && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFreeze}
                disabled={isFreezing}
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              >
                <Snowflake className="h-3 w-3 mr-1" />
                {isFreezing ? "..." : "Freeze"}
              </Button>
            )}
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={cn(
              "text-4xl font-bold",
              dailyStreak > 0 ? "text-orange-400" : "text-white/40"
            )}>
              {dailyStreak}
            </span>
            <span className="text-sm text-white/50">days</span>
          </div>

          {daily.isActive && daily.hoursUntilExpiry !== null && (
            <p className="text-xs text-white/50">
              {daily.hoursUntilExpiry <= 6 ? (
                <span className="text-orange-400">
                  Expires in {Math.ceil(daily.hoursUntilExpiry)}h - stay active!
                </span>
              ) : (
                `Resets in ${Math.ceil(daily.hoursUntilExpiry)}h`
              )}
            </p>
          )}

          {!daily.isActive && daily.longest > 0 && (
            <p className="text-xs text-white/50">
              Best: {daily.longest} days
            </p>
          )}

          {/* Streak milestones */}
          <div className="mt-3 flex gap-1">
            {[7, 30, 90].map((milestone) => (
              <div
                key={milestone}
                className={cn(
                  "flex-1 h-1.5 rounded-full",
                  dailyStreak >= milestone
                    ? "bg-gradient-to-r from-orange-500 to-red-500"
                    : "bg-white/10"
                )}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>7d</span>
            <span>30d</span>
            <span>90d</span>
          </div>
        </div>

        {/* Weekly Streak */}
        <div className={cn(
          "rounded-xl p-4 border transition-all",
          weeklyStreak > 0 
            ? "bg-gradient-to-br from-violet-500/20 to-purple-500/10 border-violet-500/30" 
            : "bg-white/5 border-white/10"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "p-2 rounded-lg",
              weeklyStreak > 0 
                ? "bg-gradient-to-br from-violet-500 to-purple-500 text-white" 
                : "bg-white/10 text-white/50"
            )}>
              <Calendar className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-white/80">Weekly Streak</span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className={cn(
              "text-4xl font-bold",
              weeklyStreak > 0 ? "text-violet-400" : "text-white/40"
            )}>
              {weeklyStreak}
            </span>
            <span className="text-sm text-white/50">weeks</span>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>{weekly.pointsThisWeek} pts this week</span>
              <span>{weekly.pointsRequired} goal</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  weekly.isOnTrack
                    ? "bg-gradient-to-r from-violet-500 to-purple-400"
                    : "bg-gradient-to-r from-amber-500 to-orange-400"
                )}
                style={{ width: `${Math.min(100, (weekly.pointsThisWeek / weekly.pointsRequired) * 100)}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-white/50">
            {weekly.isOnTrack ? (
              <span className="text-green-400">On track! Keep it up</span>
            ) : (
              <span>{weekly.daysUntilReset} days left to hit goal</span>
            )}
          </p>

          {/* Weekly milestones */}
          <div className="mt-3 flex gap-1">
            {[4, 12, 52].map((milestone) => (
              <div
                key={milestone}
                className={cn(
                  "flex-1 h-1.5 rounded-full",
                  weeklyStreak >= milestone
                    ? "bg-gradient-to-r from-violet-500 to-purple-500"
                    : "bg-white/10"
                )}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-white/40">
            <span>4w</span>
            <span>12w</span>
            <span>52w</span>
          </div>
        </div>
      </div>
    </div>
  );
}
