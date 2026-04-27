"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Flame, Zap, Target, Trophy, Settings2, Check, Sparkles, PartyPopper, Star, X } from "lucide-react";
import type { GamificationStats, StreakStatus } from "@/types";
import { Button } from "@/components/ui/button";

// Celebration messages for weekly goal completion
const CELEBRATION_MESSAGES = [
  { title: "Goal crushed! 🎉", message: "You're building an amazing network. Your future self will thank you!" },
  { title: "Networking champion! 🏆", message: "You've unlocked this week's connections. Keep the momentum going!" },
  { title: "You did it! ⭐", message: "Consistency is key, and you've got it. Your network is growing stronger!" },
  { title: "Weekly win! 🚀", message: "Another goal achieved! You're becoming a networking superstar!" },
  { title: "Fantastic week! 💪", message: "You showed up for your network, and that's powerful!" },
];

const WEEKLY_GOAL_OPTIONS = [
  { value: 10, label: "Light", description: "2 messages/week" },
  { value: 15, label: "Easy", description: "3 messages/week" },
  { value: 25, label: "Moderate", description: "5 messages/week" },
  { value: 35, label: "Active", description: "7 messages/week" },
  { value: 50, label: "Ambitious", description: "10 messages/week" },
  { value: 75, label: "Power", description: "15 messages/week" },
  { value: 100, label: "Champion", description: "20 messages/week" },
];

// Get a unique key for the current week (for tracking celebration shown)
function getWeekKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber}`;
}

interface StatsCardsProps {
  matchCount?: number;
  matchScore?: number;
}

export function StatsCards({ matchCount, matchScore }: StatsCardsProps = {}) {
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null);
  const [streaks, setStreaks] = useState<StreakStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [isUpdatingGoal, setIsUpdatingGoal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState(CELEBRATION_MESSAGES[0]);
  const [hasSeenCelebration, setHasSeenCelebration] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const goalPickerRef = useRef<HTMLDivElement>(null);
  
  // Check localStorage for celebration state on mount
  useEffect(() => {
    const weekKey = getWeekKey();
    const seenKey = `celebration_seen_${weekKey}`;
    setHasSeenCelebration(localStorage.getItem(seenKey) === 'true');
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/activity");

      if (response.status === 401) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.stats) {
        setGamificationStats(data.stats);
      }
      if (data.streaks) {
        setStreaks(data.streaks);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch gamification stats:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStats]);

  // Close goal picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (goalPickerRef.current && !goalPickerRef.current.contains(event.target as Node)) {
        setShowGoalPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateWeeklyGoal = async (newGoal: number) => {
    setIsUpdatingGoal(true);
    try {
      const response = await fetch("/api/activity", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyGoal: newGoal }),
      });
      
      if (response.ok) {
        // Refetch stats to get updated goal
        await fetchStats();
        setShowGoalPicker(false);
      }
    } catch (error) {
      console.error("Failed to update weekly goal:", error);
    } finally {
      setIsUpdatingGoal(false);
    }
  };

  const totalPoints = gamificationStats?.totalPoints || 0;
  const dailyStreak = streaks?.daily?.current || 0;
  const weeklyPoints = streaks?.weekly?.pointsThisWeek || 0;
  const weeklyGoal = streaks?.weekly?.pointsRequired || 50;
  const weeklyProgress = Math.min(100, Math.round((weeklyPoints / weeklyGoal) * 100));
  const goalMet = weeklyPoints >= weeklyGoal;

  // Trigger celebration when goal is met for the first time this week
  useEffect(() => {
    if (goalMet && !hasSeenCelebration && !isLoading) {
      const randomMessage = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
      setCelebrationMessage(randomMessage);
      setShowCelebration(true);
      
      // Mark as seen for this week
      const weekKey = getWeekKey();
      localStorage.setItem(`celebration_seen_${weekKey}`, 'true');
      setHasSeenCelebration(true);
    }
  }, [goalMet, hasSeenCelebration, isLoading]);

  const dismissCelebration = () => {
    setShowCelebration(false);
  };

  return (
    <div className="space-y-4">
      {/* Weekly Goal Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative bg-gradient-to-br from-violet-900/90 via-purple-900/90 to-fuchsia-900/90 border border-violet-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-violet-500/20 animate-in zoom-in-95 duration-300">
            {/* Close button */}
            <button 
              onClick={dismissCelebration}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            {/* Celebration content */}
            <div className="text-center">
              {/* Animated icons */}
              <div className="flex justify-center gap-3 mb-4">
                <PartyPopper className="h-8 w-8 text-yellow-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <Star className="h-10 w-10 text-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <PartyPopper className="h-8 w-8 text-yellow-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">
                {celebrationMessage.title}
              </h2>
              
              {/* Stats highlight */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4">
                <Target className="h-5 w-5 text-green-400" />
                <span className="text-lg font-semibold text-white">
                  {weeklyPoints} / {weeklyGoal} points
                </span>
                <Sparkles className="h-5 w-5 text-amber-400" />
              </div>
              
              {/* Message */}
              <p className="text-white/80 mb-6">
                {celebrationMessage.message}
              </p>
              
              {/* Action buttons */}
              <div className="flex gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => {
                    dismissCelebration();
                    window.location.href = "/explore";
                  }}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Search attendees
                </Button>
                <button
                  onClick={dismissCelebration}
                  className="px-5 py-2.5 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      )}

      {/* Goal Met Banner (persistent, smaller celebration) */}
      {goalMet && !showCelebration && (
        <div className="bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-300">
              Weekly goal achieved! 🎉
            </p>
            <p className="text-xs text-white/60">
              You've hit {weeklyPoints} points this week. Keep connecting to build even more momentum!
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/explore'}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-500/20 text-green-300 rounded-full hover:bg-green-500/30 transition-colors border border-green-500/30"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Find more matches
          </button>
        </div>
      )}

      {/* Main stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection Points */}
        <div className={`
          hover-lift bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 
          rounded-xl p-3 sm:p-4 transition-all duration-300
          ${isLoading ? 'animate-pulse' : ''}
        `}>
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-black">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {isLoading ? "—" : totalPoints.toLocaleString()}
              </p>
              <p className="text-xs sm:text-sm text-cyan-300/80">Connection points</p>
            </div>
          </div>
        </div>

        {/* Daily Streak */}
        <div className={`
          bg-white/5 border rounded-xl p-3 sm:p-4 transition-all duration-300
          ${dailyStreak >= 7 ? 'border-orange-500/50 shadow-lg shadow-orange-500/10' : 'border-white/10'}
          ${isLoading ? 'animate-pulse' : ''}
        `}>
          <div className="flex items-center gap-3">
            <div className={`p-2 sm:p-3 rounded-xl ${dailyStreak > 0 ? 'bg-gradient-to-br from-orange-500 to-red-500 text-white' : 'bg-orange-500/20 text-orange-400'}`}>
              <Flame className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1">
                <p className={`text-2xl sm:text-3xl font-bold ${dailyStreak > 0 ? 'text-orange-400' : 'text-white/50'}`}>
                  {isLoading ? "—" : dailyStreak}
                </p>
                <span className="text-xs text-white/40">days</span>
              </div>
              <p className="text-xs sm:text-sm text-white/60">Daily streak</p>
            </div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div 
          ref={goalPickerRef}
          className={`
            hover-lift relative rounded-xl p-3 sm:p-4 transition-all duration-300
            ${goalMet 
              ? 'bg-gradient-to-br from-green-500/20 via-emerald-500/15 to-teal-500/10 border border-green-500/30 shadow-lg shadow-green-500/10' 
              : 'bg-white/5 border border-white/10'
            }
            ${isLoading ? 'animate-pulse' : ''}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 sm:p-3 rounded-xl ${
              goalMet 
                ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white' 
                : 'bg-violet-500/20 text-violet-400'
            }`}>
              {goalMet ? <Trophy className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1">
                <p className={`text-2xl sm:text-3xl font-bold ${goalMet ? 'text-green-400' : 'text-white'}`}>
                  {isLoading ? "—" : weeklyPoints}
                </p>
                <span className="text-xs text-white/40">/ {weeklyGoal}</span>
                {goalMet && <Sparkles className="h-4 w-4 text-amber-400 ml-1" />}
              </div>
              <p className={`text-xs sm:text-sm ${goalMet ? 'text-green-300/80' : 'text-white/60'}`}>
                {goalMet ? 'Goal achieved!' : 'Weekly goal'}
              </p>
            </div>
            {/* Settings button */}
            <button
              onClick={() => setShowGoalPicker(!showGoalPicker)}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="Change weekly goal"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
          {/* Progress bar */}
          {!isLoading && (
            <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  goalMet 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400 animate-pulse' 
                    : 'bg-gradient-to-r from-violet-500 to-purple-400'
                }`}
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
          )}

          {/* Goal Picker Dropdown — left column on mobile: right-0 would place w-64 mostly off-screen left */}
          {showGoalPicker && (
            <div className="absolute left-0 right-auto top-full mt-2 z-50 w-64 max-w-[min(16rem,calc(100vw-1.5rem))] lg:left-auto lg:right-0 bg-gray-900 border border-white/20 rounded-xl shadow-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs font-medium text-white/50 tracking-wide">Set weekly goal</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {WEEKLY_GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateWeeklyGoal(option.value)}
                    disabled={isUpdatingGoal}
                    className={`w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors ${
                      weeklyGoal === option.value ? 'bg-violet-500/20' : ''
                    } ${isUpdatingGoal ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium text-white">
                        {option.value} pts
                        <span className="ml-2 text-xs text-white/50">{option.label}</span>
                      </p>
                      <p className="text-xs text-white/40">{option.description}</p>
                    </div>
                    {weeklyGoal === option.value && (
                      <Check className="h-4 w-4 text-violet-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Match Score / Total Matches */}
        <div className={`
          hover-lift bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 transition-all duration-300
          ${isLoading ? 'animate-pulse' : ''}
        `}>
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-3 rounded-xl bg-fuchsia-500/20 text-fuchsia-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {isLoading ? "—" : (matchScore ? `${matchScore}%` : matchCount || 0)}
              </p>
              <p className="text-xs sm:text-sm text-white/60">
                {matchScore ? "Avg match" : "Total matches"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Streak warning/encouragement */}
      {!isLoading && streaks?.daily?.isActive && streaks.daily.hoursUntilExpiry !== null && streaks.daily.hoursUntilExpiry <= 6 && dailyStreak >= 3 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center gap-3">
          <Flame className="h-5 w-5 text-orange-400 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-orange-300">
              <span className="font-semibold">Streak at risk!</span> Your {dailyStreak}-day streak ends in {Math.ceil(streaks.daily.hoursUntilExpiry)} hours.
            </p>
          </div>
          <button 
            onClick={() => window.location.href = '/messages'}
            className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-full hover:bg-orange-400 transition-colors"
          >
            Keep it going
          </button>
        </div>
      )}
    </div>
  );
}

