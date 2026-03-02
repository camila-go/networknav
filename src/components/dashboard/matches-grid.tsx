"use client";

import React, { useState, useEffect, useRef } from "react";
import { MatchCard } from "./match-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Flame, Target, MessageCircle, Rocket, Heart, Star, TrendingUp } from "lucide-react";
import type { MatchWithUser, Commonality, StreakStatus } from "@/types";

// Personalized encouragement messages based on user state
const ENCOURAGEMENT_MESSAGES = {
  newUser: [
    { icon: Sparkles, text: "Your next great connection is just a message away!", color: "text-cyan-400" },
    { icon: Rocket, text: "Ready to expand your network? Start with who resonates most.", color: "text-violet-400" },
    { icon: Heart, text: "Every meaningful relationship starts with a single hello.", color: "text-rose-400" },
  ],
  streakActive: [
    { icon: Flame, text: "streak on fire! Keep connecting to maintain your momentum.", color: "text-orange-400", dynamic: true },
    { icon: TrendingUp, text: "You're on a roll! Each connection builds your network strength.", color: "text-green-400" },
    { icon: Star, text: "Consistency is your superpower. Another day, another opportunity!", color: "text-amber-400" },
  ],
  goalClose: [
    { icon: Target, text: "points away from your weekly goal. You've got this!", color: "text-violet-400", dynamic: true },
    { icon: Sparkles, text: "So close! One more connection could seal the deal.", color: "text-cyan-400" },
  ],
  goalMet: [
    { icon: Star, text: "Weekly champion! You're building something amazing.", color: "text-green-400" },
    { icon: Rocket, text: "Goal crushed! Why stop now? Every connection counts.", color: "text-amber-400" },
    { icon: Heart, text: "You're on fire this week! Your network thanks you.", color: "text-rose-400" },
  ],
  comeBack: [
    { icon: MessageCircle, text: "We missed you! Your matches are waiting to connect.", color: "text-cyan-400" },
    { icon: Sparkles, text: "Fresh matches, fresh opportunities. Let's get connecting!", color: "text-violet-400" },
  ],
};

// Mock data - replace with real data fetch
const mockMatches: MatchWithUser[] = [
  {
    id: "1",
    userId: "current-user",
    matchedUserId: "user-1",
    matchedUser: {
      id: "user-1",
      profile: {
        name: "Sarah Chen",
        position: "VP of Engineering",
        title: "Engineering Leader",
        company: "TechCorp",
        photoUrl: undefined,
      },
      questionnaireCompleted: true,
    },
    type: "high-affinity",
    commonalities: [
      { category: "professional", description: "Both in Technology industry", weight: 0.9 },
      { category: "professional", description: "Similar team scaling challenges", weight: 0.85 },
      { category: "hobby", description: "Both enjoy hiking and outdoor adventures", weight: 0.7 },
      { category: "values", description: "Share servant leadership philosophy", weight: 0.8 },
    ],
    conversationStarters: [
      "Ask Sarah about her experience scaling engineering teams from 20 to 100+",
      "Compare notes on your approaches to talent retention in tech",
    ],
    score: 0.92,
    generatedAt: new Date(),
    viewed: false,
    passed: false,
  },
  {
    id: "2",
    userId: "current-user",
    matchedUserId: "user-2",
    matchedUser: {
      id: "user-2",
      profile: {
        name: "Marcus Johnson",
        position: "Chief People Officer",
        title: "HR Executive",
        company: "GrowthStartup",
        photoUrl: undefined,
      },
      questionnaireCompleted: true,
    },
    type: "strategic",
    commonalities: [
      { category: "professional", description: "Complementary expertise: Tech + People", weight: 0.85 },
      { category: "professional", description: "Both focused on organizational transformation", weight: 0.8 },
      { category: "lifestyle", description: "Both value work-life integration", weight: 0.6 },
    ],
    conversationStarters: [
      "Marcus's people expertise could help with your talent retention challenges",
      "Discuss the intersection of tech and culture in scaling organizations",
    ],
    score: 0.78,
    generatedAt: new Date(),
    viewed: true,
    passed: false,
  },
  {
    id: "3",
    userId: "current-user",
    matchedUserId: "user-3",
    matchedUser: {
      id: "user-3",
      profile: {
        name: "Elena Rodriguez",
        position: "CEO",
        title: "Founder & CEO",
        company: "InnovateCo",
        photoUrl: undefined,
      },
      questionnaireCompleted: true,
    },
    type: "high-affinity",
    commonalities: [
      { category: "professional", description: "Both founders/entrepreneurs", weight: 0.95 },
      { category: "professional", description: "Similar growth stage challenges", weight: 0.85 },
      { category: "hobby", description: "Passionate about mentorship", weight: 0.75 },
      { category: "values", description: "Data-informed decision making", weight: 0.7 },
    ],
    conversationStarters: [
      "Elena just closed Series B - ask about her fundraising journey",
      "Compare your approaches to building executive teams",
    ],
    score: 0.89,
    generatedAt: new Date(),
    viewed: false,
    passed: false,
  },
];

interface MatchesGridProps {
  onMatchesLoaded?: (count: number, avgScore: number) => void;
}

export function MatchesGrid({ onMatchesLoaded }: MatchesGridProps = {}) {
  const [matches, setMatches] = useState<MatchWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streaks, setStreaks] = useState<StreakStatus | null>(null);
  const [encouragement, setEncouragement] = useState<{ icon: React.ComponentType<{ className?: string }>; text: string; color: string } | null>(null);

  useEffect(() => {
    fetchMatches();
    fetchStreakData();
  }, []);

  async function fetchStreakData() {
    try {
      const response = await fetch("/api/activity");
      const data = await response.json();
      if (data.streaks) {
        setStreaks(data.streaks);
        // Determine encouragement message based on user state
        const message = getEncouragementMessage(data.streaks);
        setEncouragement(message);
      } else {
        // New user - show welcome message
        const messages = ENCOURAGEMENT_MESSAGES.newUser;
        setEncouragement(messages[Math.floor(Math.random() * messages.length)]);
      }
    } catch (error) {
      // Default to new user message on error
      const messages = ENCOURAGEMENT_MESSAGES.newUser;
      setEncouragement(messages[Math.floor(Math.random() * messages.length)]);
    }
  }

  function getEncouragementMessage(streakData: StreakStatus) {
    const dailyStreak = streakData.daily?.current || 0;
    const weeklyPoints = streakData.weekly?.pointsThisWeek || 0;
    const weeklyGoal = streakData.weekly?.pointsRequired || 25;
    const pointsToGoal = weeklyGoal - weeklyPoints;

    // Priority order: Goal met > Close to goal > Active streak > Come back
    if (weeklyPoints >= weeklyGoal) {
      const messages = ENCOURAGEMENT_MESSAGES.goalMet;
      return messages[Math.floor(Math.random() * messages.length)];
    }
    
    if (pointsToGoal <= 10 && pointsToGoal > 0) {
      const messages = ENCOURAGEMENT_MESSAGES.goalClose;
      const message = messages[Math.floor(Math.random() * messages.length)];
      if (message.dynamic) {
        return { ...message, text: `${pointsToGoal} ${message.text}` };
      }
      return message;
    }
    
    if (dailyStreak >= 3) {
      const messages = ENCOURAGEMENT_MESSAGES.streakActive;
      const message = messages[Math.floor(Math.random() * messages.length)];
      if (message.dynamic) {
        return { ...message, text: `${dailyStreak}-day ${message.text}` };
      }
      return message;
    }
    
    if (dailyStreak === 0 && weeklyPoints === 0) {
      const messages = ENCOURAGEMENT_MESSAGES.comeBack;
      return messages[Math.floor(Math.random() * messages.length)];
    }
    
    // Default to new user messages
    const messages = ENCOURAGEMENT_MESSAGES.newUser;
    return messages[Math.floor(Math.random() * messages.length)];
  }

  async function fetchMatches() {
    try {
      const response = await fetch("/api/matches");
      const result = await response.json();

      if (result.success && result.data.matches) {
        const fetchedMatches = result.data.matches;
        setMatches(fetchedMatches);
        
        // Notify parent of match count
        if (onMatchesLoaded) {
          const avgScore = fetchedMatches.length > 0
            ? Math.round(fetchedMatches.reduce((sum: number, m: MatchWithUser) => {
                const score = m.score || 0;
                return sum + (score > 1 ? score / 100 : score);
              }, 0) / fetchedMatches.length * 100)
            : 0;
          onMatchesLoaded(fetchedMatches.length, avgScore);
        }
      } else {
        // Use mock data as fallback
        setMatches(mockMatches);
        if (onMatchesLoaded) {
          onMatchesLoaded(mockMatches.length, 85);
        }
      }
    } catch (error) {
      console.error("Failed to fetch matches:", error);
      setMatches(mockMatches);
      if (onMatchesLoaded) {
        onMatchesLoaded(mockMatches.length, 85);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const highAffinityMatches = matches.filter((m) => m.type === "high-affinity" && !m.passed);
  const strategicMatches = matches.filter((m) => m.type === "strategic" && !m.passed);

  async function handlePass(matchId: string) {
    try {
      await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passed: true }),
      });
      
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, passed: true } : m))
      );
    } catch (error) {
      console.error("Failed to pass match:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-80 shimmer rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Personalized Encouragement Banner */}
      {encouragement && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 rounded-xl">
          <encouragement.icon className={`h-5 w-5 ${encouragement.color} flex-shrink-0`} />
          <p className="text-sm text-white/80">
            {encouragement.text}
          </p>
        </div>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-white/5 border border-white/10 w-full grid grid-cols-3">
        <TabsTrigger value="all" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 text-xs sm:text-sm px-2 sm:px-4">
          <span className="hidden sm:inline">All Matches</span>
          <span className="sm:hidden">All</span>
          <span className="ml-1">({matches.filter(m => !m.passed).length})</span>
        </TabsTrigger>
        <TabsTrigger value="high-affinity" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 text-xs sm:text-sm px-2 sm:px-4">
          <span className="hidden sm:inline">High-Affinity</span>
          <span className="sm:hidden">High</span>
          <span className="ml-1">({highAffinityMatches.length})</span>
        </TabsTrigger>
        <TabsTrigger value="strategic" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 text-xs sm:text-sm px-2 sm:px-4">
          Strategic ({strategicMatches.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <MatchGrid
          matches={matches.filter((m) => !m.passed)}
          onPass={handlePass}
        />
      </TabsContent>

      <TabsContent value="high-affinity">
        <MatchGrid
          matches={highAffinityMatches}
          onPass={handlePass}
        />
      </TabsContent>

      <TabsContent value="strategic">
        <MatchGrid
          matches={strategicMatches}
          onPass={handlePass}
        />
      </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchGrid({
  matches,
  onPass,
}: {
  matches: MatchWithUser[];
  onPass: (id: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track scroll position to update active index
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = scrollRef.current.offsetWidth * 0.85 + 16; // card width + gap
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, matches.length - 1));
  };

  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No matches in this category yet.</p>
        <p className="text-sm mt-1">Check back soon for new connections!</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Horizontal swipeable cards */}
      <div className="md:hidden -mx-4 px-4">
        {/* Card counter */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white/70">
            {activeIndex + 1} of {matches.length}
          </span>
          <span className="text-xs text-white/40">Swipe to browse →</span>
        </div>

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide scroll-smooth"
          style={{ scrollPaddingLeft: '0px' }}
        >
          {matches.map((match, index) => (
            <div
              key={match.id}
              className="flex-shrink-0 w-[85vw] max-w-[340px] snap-start"
            >
              <MatchCard match={match} onPass={onPass} />
            </div>
          ))}
        </div>

        {/* Pagination dots */}
        {matches.length > 1 && matches.length <= 10 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {matches.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (scrollRef.current) {
                    const cardWidth = scrollRef.current.offsetWidth * 0.85 + 16;
                    scrollRef.current.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
                  }
                }}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex 
                    ? 'w-6 bg-cyan-400' 
                    : 'w-1.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match, index) => (
          <div
            key={match.id}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <MatchCard match={match} onPass={onPass} />
          </div>
        ))}
      </div>
    </>
  );
}

