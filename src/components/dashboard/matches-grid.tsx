"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MatchCard } from "./match-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Flame,
  Target,
  MessageCircle,
  Rocket,
  Heart,
  Star,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { MatchWithUser, MatchType, StreakStatus } from "@/types";
import { SHOW_GAMIFICATION_UI } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";
import { getHorizontalCarouselStride } from "@/lib/horizontal-carousel";
import { Button } from "@/components/ui/button";

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

interface MatchesGridProps {
  onMatchesLoaded?: (count: number, avgScore: number) => void;
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

export function MatchesGrid({ onMatchesLoaded }: MatchesGridProps = {}) {
  const [matches, setMatches] = useState<MatchWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [streaks, setStreaks] = useState<StreakStatus | null>(null);
  const [encouragement, setEncouragement] = useState<{ icon: React.ComponentType<{ className?: string }>; text: string; color: string } | null>(null);
  const [viewerFirstName, setViewerFirstName] = useState<string | undefined>();

  const fetchStreakData = useCallback(async () => {
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
  }, []);

  const viewerFirstNameRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    viewerFirstNameRef.current = viewerFirstName;
  }, [viewerFirstName]);

  const fetchMatches = useCallback(async () => {
    try {
      const response = await fetch("/api/matches");
      const result = await response.json();

      if (result.success && result.data.matches) {
        const fetchedMatches = result.data.matches;
        setMatches(fetchedMatches);
        void enrichStartersProgressively(fetchedMatches, setMatches, () => viewerFirstNameRef.current);

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
        setMatches([]);
        if (onMatchesLoaded) {
          onMatchesLoaded(0, 0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch matches:", error);
      setMatches([]);
      if (onMatchesLoaded) {
        onMatchesLoaded(0, 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onMatchesLoaded]);

  useEffect(() => {
    fetchMatches();
    if (SHOW_GAMIFICATION_UI) {
      void fetchStreakData();
    } else {
      setStreaks(null);
      setEncouragement(null);
    }
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success || !d.data?.user?.profile?.name) return;
        const first = String(d.data.user.profile.name).trim().split(/\s+/)[0];
        if (first) setViewerFirstName(first);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchMatches, fetchStreakData]);

  const highAffinityMatches = matches.filter((m) => m.type === "high-affinity" && !m.passed);
  const strategicMatches = matches.filter((m) => m.type === "strategic" && !m.passed);

  const allActiveMatchesInterleaved = useMemo(
    () => interleaveMatchesByType(matches.filter((m) => !m.passed)),
    [matches]
  );

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
      <>
        <div className="grid grid-cols-1 gap-6 md:hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="hidden w-full grid-cols-3 grid-rows-[480px_480px] gap-6 md:grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-full rounded-2xl shimmer" />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Personalized Encouragement Banner (streak / weekly goal messaging) */}
      {SHOW_GAMIFICATION_UI && encouragement && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 rounded-xl">
          <encouragement.icon className={`h-5 w-5 ${encouragement.color} flex-shrink-0`} />
          <p className="text-sm text-white/80">
            {encouragement.text}
          </p>
        </div>
      )}

      <Tabs defaultValue="all" className="min-w-0 w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3 border border-white/10 bg-white/5">
        <TabsTrigger value="all" className="press data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(34,211,238,0.55)] text-white/60 text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 ease-out">
          <span className="hidden sm:inline">All Matches</span>
          <span className="sm:hidden">All</span>
          <span className="ml-1">({matches.filter(m => !m.passed).length})</span>
        </TabsTrigger>
        <TabsTrigger value="high-affinity" className="press data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(34,211,238,0.55)] text-white/60 text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 ease-out">
          <span className="hidden sm:inline">High-Affinity</span>
          <span className="sm:hidden">High</span>
          <span className="ml-1">({highAffinityMatches.length})</span>
        </TabsTrigger>
        <TabsTrigger value="strategic" className="press data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(237,126,53,0.6)] text-white/60 text-xs sm:text-sm px-2 sm:px-4 transition-all duration-200 ease-out">
          Strategic ({strategicMatches.length})
        </TabsTrigger>
      </TabsList>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: "#1b8ea6" }}
          />
          <p className="text-xs leading-snug">
            <span className="font-semibold text-white">High-Affinity</span>
            <span className="text-white/60"> — Leaders who share your goals, challenges, and interests. Great for validating ideas and finding common ground.</span>
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: "#ed7e35" }}
          />
          <p className="text-xs leading-snug">
            <span className="font-semibold text-white">Strategic</span>
            <span className="text-white/60"> — Leaders with complementary expertise. Great for learning, growth, and fresh perspectives.</span>
          </p>
        </div>
      </div>

      <TabsContent value="all" className="min-w-0">
        <MatchGrid
          matches={allActiveMatchesInterleaved}
          onPass={handlePass}
          viewerFirstName={viewerFirstName}
        />
      </TabsContent>

      <TabsContent value="high-affinity" className="min-w-0">
        <MatchGrid
          matches={highAffinityMatches}
          onPass={handlePass}
          viewerFirstName={viewerFirstName}
        />
      </TabsContent>

      <TabsContent value="strategic" className="min-w-0">
        <MatchGrid
          matches={strategicMatches}
          onPass={handlePass}
          viewerFirstName={viewerFirstName}
        />
      </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * For "All matches", alternate high-affinity and strategic so the grid/swiper
 * isn't dominated by one banner color (API order often groups by type).
 * Preserves relative order within each type. Starts with high-affinity when both exist.
 */
function interleaveMatchesByType<T extends { type: MatchType }>(items: T[]): T[] {
  const highAffinity = items.filter((m) => m.type === "high-affinity");
  const strategic = items.filter((m) => m.type === "strategic");
  const rest = items.filter(
    (m) => m.type !== "high-affinity" && m.type !== "strategic"
  );

  if (highAffinity.length === 0 || strategic.length === 0) {
    return items;
  }

  const out: T[] = [];
  let hi = 0;
  let si = 0;
  let preferHighAffinity = true;

  while (hi < highAffinity.length || si < strategic.length) {
    if (preferHighAffinity) {
      if (hi < highAffinity.length) {
        out.push(highAffinity[hi++]);
      } else {
        out.push(strategic[si++]);
      }
    } else {
      if (si < strategic.length) {
        out.push(strategic[si++]);
      } else {
        out.push(highAffinity[hi++]);
      }
    }
    preferHighAffinity = !preferHighAffinity;
  }

  return rest.length > 0 ? [...out, ...rest] : out;
}

function getDesktopMatchPageStride(scrollEl: HTMLDivElement): number {
  return scrollEl.clientWidth;
}

function chunkMatches<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

const DESKTOP_MATCHES_PER_PAGE = 6;

function DesktopMatchPageGrid({
  pageMatches,
  onPass,
  viewerFirstName,
  pageIndex,
}: {
  pageMatches: MatchWithUser[];
  onPass: (id: string) => void;
  viewerFirstName?: string;
  pageIndex: number;
}) {
  const multiRow = pageMatches.length > 3;

  return (
    <div
      data-desktop-match-page
      className={cn(
        // Explicit row heights keep every card a uniform pixel size across pages
        // regardless of content length (long bios, extra commonalities, etc.).
        "grid w-full min-w-full shrink-0 snap-center snap-always grid-cols-3 gap-6",
        multiRow
          ? "grid-rows-[480px_480px]"
          : "grid-rows-[480px]"
      )}
    >
      {pageMatches.map((match, i) => (
        <div
          key={match.id}
          className="animate-fade-in flex h-full min-h-0 flex-col overflow-hidden"
          style={{ animationDelay: `${pageIndex * 80 + i * 60}ms` }}
        >
          {/* `variant="carousel"` gives the card a flex layout that clips to the
              parent height and scrolls the middle region internally when needed. */}
          <MatchCard
            match={match}
            onPass={onPass}
            viewerFirstName={viewerFirstName}
            variant="carousel"
          />
        </div>
      ))}
    </div>
  );
}

function MatchGrid({
  matches,
  onPass,
  viewerFirstName,
}: {
  matches: MatchWithUser[];
  onPass: (id: string) => void;
  viewerFirstName?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const desktopPageScrollRef = useRef<HTMLDivElement>(null);
  const [desktopPageIndex, setDesktopPageIndex] = useState(0);

  const desktopPages = useMemo(
    () => chunkMatches(matches, DESKTOP_MATCHES_PER_PAGE),
    [matches]
  );

  const mobileMatchIds = useMemo(
    () => matches.map((m) => m.id).join("\0"),
    [matches]
  );

  useEffect(() => {
    setDesktopPageIndex((i) =>
      desktopPages.length === 0 ? 0 : Math.min(i, desktopPages.length - 1)
    );
  }, [desktopPages.length]);

  useEffect(() => {
    setActiveIndex(0);
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [mobileMatchIds]);

  // Mobile: IntersectionObserver tracks the centered slide — iOS often under-reports scroll events
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || matches.length <= 1) return;

    const mq = window.matchMedia("(max-width: 767px)");
    let observer: IntersectionObserver | null = null;

    const attach = () => {
      observer?.disconnect();
      observer = null;
      if (!mq.matches) return;

      const slides = root.querySelectorAll<HTMLElement>("[data-carousel-slide]");
      if (slides.length === 0) return;

      observer = new IntersectionObserver(
        (entries) => {
          let bestIdx = 0;
          let bestRatio = 0;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const idx = [...slides].indexOf(entry.target as HTMLElement);
            if (idx < 0) continue;
            const r = entry.intersectionRatio;
            if (r > bestRatio) {
              bestRatio = r;
              bestIdx = idx;
            }
          }
          if (bestRatio > 0.05) {
            setActiveIndex((prev) => (prev === bestIdx ? prev : bestIdx));
          }
        },
        { root, rootMargin: "-8% 0px -8% 0px", threshold: [0.1, 0.25, 0.5, 0.75, 0.95] }
      );

      slides.forEach((el) => observer!.observe(el));
    };

    attach();
    mq.addEventListener("change", attach);
    return () => {
      mq.removeEventListener("change", attach);
      observer?.disconnect();
    };
  }, [mobileMatchIds, matches.length]);

  // Track scroll position to update active index (fallback + fine-tune)
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const stride = getHorizontalCarouselStride(scrollRef.current);
    if (stride < 8) return;
    const newIndex = Math.round(scrollLeft / stride);
    if (!Number.isFinite(newIndex)) return;
    const clamped = Math.min(Math.max(0, newIndex), matches.length - 1);
    setActiveIndex((prev) => (prev === clamped ? prev : clamped));
  };

  const handleDesktopPageScroll = () => {
    const el = desktopPageScrollRef.current;
    if (!el || desktopPages.length <= 1) return;
    const stride = getDesktopMatchPageStride(el);
    if (stride < 8) return;
    const idx = Math.round(el.scrollLeft / stride);
    setDesktopPageIndex(
      Math.min(Math.max(0, idx), desktopPages.length - 1)
    );
  };

  const goDesktopPage = (index: number) => {
    const el = desktopPageScrollRef.current;
    if (!el || desktopPages.length === 0) return;
    const stride = getDesktopMatchPageStride(el);
    const i = Math.min(Math.max(0, index), desktopPages.length - 1);
    el.scrollTo({ left: stride * i, behavior: "smooth" });
    setDesktopPageIndex(i);
  };

  const currentPageMatches = desktopPages[desktopPageIndex] ?? [];
  const currentPageSize = currentPageMatches.length;

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
          className="flex min-w-0 touch-manipulation touch-pan-x items-start gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth snap-x snap-proximity pb-1 pl-0.5 pr-0.5 pt-0.5 [-webkit-overflow-scrolling:touch] scrollbar-hide"
          style={{
            scrollPaddingLeft: "max(0px,env(safe-area-inset-left))",
            scrollPaddingRight: "max(0px,env(safe-area-inset-right))",
            WebkitOverflowScrolling: "touch",
            overscrollBehaviorX: "contain",
          }}
        >
          {matches.map((match) => (
            <div
              key={match.id}
              data-carousel-slide
              className="flex h-[min(680px,calc(100dvh-12.5rem))] min-h-[20rem] w-[min(85vw,340px)] min-w-0 flex-shrink-0 snap-start flex-col overflow-hidden"
            >
              <MatchCard
                match={match}
                onPass={onPass}
                viewerFirstName={viewerFirstName}
                variant="carousel"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: 3×2 grid (6 per page), same pagination pattern as explore search */}
      <div className="hidden md:block">
        <p className="mb-4 text-sm text-white/50">
          Showing {currentPageSize} of {matches.length} match
          {matches.length !== 1 ? "es" : ""}
        </p>
        <div className="flex flex-col">
          <div
            ref={desktopPageScrollRef}
            onScroll={handleDesktopPageScroll}
            className="flex snap-x snap-mandatory gap-0 overflow-x-auto overflow-y-visible pb-0 scrollbar-hide scroll-smooth"
          >
            {desktopPages.map((pageMatches, pageIndex) => (
              <DesktopMatchPageGrid
                key={pageMatches[0]?.id ?? `page-${pageIndex}`}
                pageMatches={pageMatches}
                onPass={onPass}
                viewerFirstName={viewerFirstName}
                pageIndex={pageIndex}
              />
            ))}
          </div>

          {desktopPages.length > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goDesktopPage(desktopPageIndex - 1)}
                disabled={desktopPageIndex === 0}
                className="press group border-[#343434] text-white/70 transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <ChevronLeft className="mr-1 h-4 w-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5" />
                Previous
              </Button>
              <span className="text-sm text-white/50">
                Page {desktopPageIndex + 1} of {desktopPages.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => goDesktopPage(desktopPageIndex + 1)}
                disabled={desktopPageIndex >= desktopPages.length - 1}
                className="press group border-[#343434] font-bold text-white transition-all duration-200 ease-out hover:-translate-y-[1px] hover:bg-white/5 disabled:opacity-50"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// Bounded concurrency keeps us under OpenRouter's free-tier rate limit.
// 3 concurrent requests was tripping 429s on Gemma which then silently
// knocked out the rest of the page via the shared cooldown in cooldown.ts;
// 2 is slower but leaves more matches with real AI starters.
const STARTER_ENRICH_CONCURRENCY = 2;

async function enrichStartersProgressively(
  matches: MatchWithUser[],
  setMatches: React.Dispatch<React.SetStateAction<MatchWithUser[]>>,
  getViewerFirstName: () => string | undefined,
) {
  for (let i = 0; i < matches.length; i += STARTER_ENRICH_CONCURRENCY) {
    const batch = matches.slice(i, i + STARTER_ENRICH_CONCURRENCY);
    await Promise.all(
      batch.map(async (m) => {
        try {
          const res = await fetch(`/api/matches/${encodeURIComponent(m.id)}/starters`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userName: getViewerFirstName() || "there",
              matchName: m.matchedUser.profile.name.split(" ")[0] || "them",
              matchType: m.type,
              commonalities: m.commonalities.map((c) => c.description),
              matchPosition: m.matchedUser.profile.title,
              matchCompany: m.matchedUser.profile.company,
              matchedUserId: m.matchedUserId,
            }),
          });
          const data = await res.json();
          const aiStarters: string[] =
            data?.success && Array.isArray(data?.data?.starters) ? data.data.starters : [];
          if (aiStarters.length === 0) return;
          setMatches((prev) =>
            prev.map((existing) =>
              existing.id !== m.id
                ? existing
                : {
                    ...existing,
                    conversationStarters: mergeStarters(aiStarters, existing.conversationStarters),
                  },
            ),
          );
        } catch {
          // Network/provider errors: leave template starters in place.
        }
      }),
    );
  }
}

function mergeStarters(ai: string[], base: string[]): string[] {
  const merged = [...ai.slice(0, 2), ...base];
  return merged
    .filter(
      (s, idx, arr) =>
        s &&
        arr.findIndex(
          (x) => x.toLowerCase().slice(0, 40) === s.toLowerCase().slice(0, 40),
        ) === idx,
    )
    .slice(0, 3);
}

