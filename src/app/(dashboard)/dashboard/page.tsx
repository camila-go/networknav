"use client";

import { Suspense, useState, useCallback } from "react";
import { MatchesGrid } from "@/components/dashboard/matches-grid";
import { NetworkPulseSection } from "@/components/dashboard/network-pulse-poll";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { BadgeProgressModal } from "@/components/gamification/badge-progress-modal";
import { SHOW_GAMIFICATION_UI } from "@/lib/feature-flags";

export default function DashboardPage() {
  const [matchStats, setMatchStats] = useState({ count: 0, avgScore: 0 });

  const handleMatchesLoaded = useCallback((count: number, avgScore: number) => {
    setMatchStats({ count, avgScore });
  }, []);

  return (
    <div className="min-w-0 space-y-8">
      {/* Network Pulse polls — above match list */}
      <NetworkPulseSection />

      {/* Welcome header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-display font-bold text-white">
            Your matches
          </h1>
          <p className="text-white/60 mt-1">
            Discover leaders who share your challenges, interests, and goals
          </p>
        </div>
        {SHOW_GAMIFICATION_UI && <BadgeProgressModal />}
      </div>

      {/* Stats overview — gamification (points, streak, weekly goal); hidden when SHOW_GAMIFICATION_UI is false */}
      {SHOW_GAMIFICATION_UI && (
        <Suspense fallback={<div className="h-24 shimmer rounded-xl" />}>
          <StatsCards matchCount={matchStats.count} matchScore={matchStats.avgScore} />
        </Suspense>
      )}

      {/* Matches grid */}
      <Suspense
        fallback={
          <>
            <div className="grid grid-cols-1 gap-6 md:hidden">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 shimmer rounded-2xl" />
              ))}
            </div>
            <div className="hidden min-h-[min(920px,88vh)] w-full grid-cols-3 grid-rows-2 gap-6 md:grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="min-h-[200px] rounded-2xl shimmer" />
              ))}
            </div>
          </>
        }
      >
        <MatchesGrid onMatchesLoaded={handleMatchesLoaded} />
      </Suspense>
    </div>
  );
}

