"use client";

import { useState, useEffect } from "react";
import { MatchCard } from "./match-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import type { MatchWithUser, Commonality } from "@/types";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchMatches();
  }, []);

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

  async function handleConnect(matchId: string) {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: match.matchedUserId }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: "Connection request sent!",
          description: `Your request has been sent to ${match.matchedUser.profile.name}.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to connect",
          description: result.error || "Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to send connection request:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again later.",
      });
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
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="mb-6 bg-white/5 border border-white/10">
        <TabsTrigger value="all" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">All Matches ({matches.filter(m => !m.passed).length})</TabsTrigger>
        <TabsTrigger value="high-affinity" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
          High-Affinity ({highAffinityMatches.length})
        </TabsTrigger>
        <TabsTrigger value="strategic" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60">
          Strategic ({strategicMatches.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <MatchGrid
          matches={matches.filter((m) => !m.passed)}
          onPass={handlePass}
          onConnect={handleConnect}
        />
      </TabsContent>

      <TabsContent value="high-affinity">
        <MatchGrid
          matches={highAffinityMatches}
          onPass={handlePass}
          onConnect={handleConnect}
        />
      </TabsContent>

      <TabsContent value="strategic">
        <MatchGrid
          matches={strategicMatches}
          onPass={handlePass}
          onConnect={handleConnect}
        />
      </TabsContent>
    </Tabs>
  );
}

function MatchGrid({
  matches,
  onPass,
  onConnect,
}: {
  matches: MatchWithUser[];
  onPass: (id: string) => void;
  onConnect: (id: string) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No matches in this category yet.</p>
        <p className="text-sm mt-1">Check back soon for new connections!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {matches.map((match, index) => (
        <div
          key={match.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <MatchCard match={match} onPass={onPass} onConnect={onConnect} />
        </div>
      ))}
    </div>
  );
}

