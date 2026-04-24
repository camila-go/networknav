"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterSidebar } from "./filter-sidebar";
import { AttendeeCard } from "./attendee-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  SlidersHorizontal,
  X,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getHorizontalCarouselStride } from "@/lib/horizontal-carousel";
import { useToast } from "@/components/ui/use-toast";
import {
  EXPLORE_SEARCH_FOCUS_EVENT,
  EXPLORE_SEARCH_FOCUS_STORAGE_KEY,
} from "@/lib/explore-search-focus";
import type { SearchFilters, AttendeeSearchResult } from "@/types";

export function ExploreContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const initialKeywords = searchParams.get("q")?.trim() ?? "";
  const [filters, setFilters] = useState<SearchFilters>({});
  const [keywords, setKeywords] = useState(initialKeywords);
  const [debouncedKeywords, setDebouncedKeywords] = useState(initialKeywords);
  const [results, setResults] = useState<AttendeeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"relevance" | "match" | "name" | "level">("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [viewerFirstName, setViewerFirstName] = useState<string | undefined>();
  const viewerFirstNameRef = useRef<string | undefined>(undefined);
  const [emphasizeSearchField, setEmphasizeSearchField] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pageSize = 12;

  const exploreSearchScope = useMemo((): "all" | "interests" => {
    return searchParams.get("scope") === "interests" ? "interests" : "all";
  }, [searchParams]);

  const searchTokenRef = useRef(0);

  const searchParamsKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = searchParams.toString();
    if (searchParamsKeyRef.current === null) {
      searchParamsKeyRef.current = key;
      return;
    }
    if (searchParamsKeyRef.current === key) return;
    searchParamsKeyRef.current = key;
    const q = searchParams.get("q")?.trim() ?? "";
    setKeywords(q);
    setDebouncedKeywords(q);
  }, [searchParams]);

  // Header magnifier: sessionStorage (nav from other tabs) + CustomEvent (already on /explore). URL ?focusSearch=1 still supported.
  const emphasizeClearTimerRef = useRef<number | null>(null);

  const triggerSearchFieldHighlight = useCallback(() => {
    setEmphasizeSearchField(true);

    const focusTry = () => {
      const el = searchInputRef.current;
      if (!el) return;
      el.focus({ preventScroll: false });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    window.setTimeout(focusTry, 0);
    window.setTimeout(focusTry, 120);
    window.setTimeout(focusTry, 400);

    if (emphasizeClearTimerRef.current) {
      clearTimeout(emphasizeClearTimerRef.current);
    }
    emphasizeClearTimerRef.current = window.setTimeout(() => {
      emphasizeClearTimerRef.current = null;
      setEmphasizeSearchField(false);
    }, 3800);
  }, []);

  useEffect(() => {
    const onFocusRequest = () => triggerSearchFieldHighlight();
    window.addEventListener(EXPLORE_SEARCH_FOCUS_EVENT, onFocusRequest);
    return () =>
      window.removeEventListener(EXPLORE_SEARCH_FOCUS_EVENT, onFocusRequest);
  }, [triggerSearchFieldHighlight]);

  useLayoutEffect(() => {
    let fromStorage = false;
    try {
      if (sessionStorage.getItem(EXPLORE_SEARCH_FOCUS_STORAGE_KEY) === "1") {
        sessionStorage.removeItem(EXPLORE_SEARCH_FOCUS_STORAGE_KEY);
        fromStorage = true;
      }
    } catch {
      /* private mode */
    }

    const fromUrl = searchParams.get("focusSearch") === "1";
    if (!fromStorage && !fromUrl) return;

    triggerSearchFieldHighlight();

    if (fromUrl) {
      const p = new URLSearchParams(searchParams.toString());
      p.delete("focusSearch");
      const qs = p.toString();
      window.setTimeout(() => {
        router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false });
      }, 150);
    }
  }, [searchParams, router, triggerSearchFieldHighlight]);

  useEffect(() => {
    return () => {
      if (emphasizeClearTimerRef.current) {
        clearTimeout(emphasizeClearTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    viewerFirstNameRef.current = viewerFirstName;
  }, [viewerFirstName]);

  // Debounce keywords
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeywords(keywords);
    }, 300);
    return () => clearTimeout(timer);
  }, [keywords]);

  // Search when filters or keywords change
  const performSearch = useCallback(async () => {
    setIsLoading(true);
    const token = ++searchTokenRef.current;
    try {
      const response = await fetch("/api/attendees/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filters,
          keywords: debouncedKeywords,
          page,
          pageSize,
          sortBy,
          searchScope: exploreSearchScope,
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (searchTokenRef.current !== token) return;
        setResults(result.data.results);
        setTotalResults(result.data.total);
        setHasMore(result.data.hasMore);
        void enrichSearchStartersProgressively(
          result.data.results as AttendeeSearchResult[],
          setResults,
          () => viewerFirstNameRef.current,
          () => searchTokenRef.current === token,
        );
      } else {
        toast({
          variant: "destructive",
          title: "Search failed",
          description: result.error || "Please try again",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    filters,
    debouncedKeywords,
    page,
    pageSize,
    sortBy,
    toast,
    exploreSearchScope,
  ]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, debouncedKeywords, sortBy]);

  function handleFiltersChange(newFilters: SearchFilters) {
    setFilters(newFilters);
  }

  function handleRequestMeeting(userId: string) {
    // Navigate to messages with the target user
    router.push(`/messages?targetUserId=${userId}`);
  }

  function handlePassAttendee(userId: string) {
    setResults((prev) => prev.filter((r) => r.user.id !== userId));
  }

  function handleSaveSearch() {
    toast({
      title: "Search saved!",
      description: "You'll be notified when new attendees match your criteria.",
    });
  }

  // Get active filter tags for display (sidebar filters)
  const activeFilterTags = Object.entries(filters)
    .filter(([, value]) => value && (Array.isArray(value) ? value.length > 0 : value !== ""))
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((v) => ({ key, value: v }));
      }
      return [{ key, value: value as string }];
    });

  const keywordFilter = debouncedKeywords.trim();
  type ActiveTag =
    | { kind: "keyword"; value: string }
    | { kind: "filter"; key: string; value: string };
  const activeTagsForDisplay: ActiveTag[] = [
    ...(keywordFilter ? [{ kind: "keyword" as const, value: keywordFilter }] : []),
    ...activeFilterTags.map((t) => ({
      kind: "filter" as const,
      key: t.key,
      value: t.value,
    })),
  ];
  const showActiveFiltersRow = activeTagsForDisplay.length > 0;

  const highAffinityOnPage = useMemo(
    () => results.filter((r) => r.matchType === "high-affinity").length,
    [results]
  );
  const MAX_VISIBLE_TAGS = 6;
  const visibleActiveTags = activeTagsForDisplay.slice(0, MAX_VISIBLE_TAGS);
  const overflowTagCount = activeTagsForDisplay.length - visibleActiveTags.length;

  function clearKeywordFilter() {
    setKeywords("");
    setDebouncedKeywords("");
  }

  function clearAllFiltersAndSearch() {
    setFilters({});
    clearKeywordFilter();
  }

  return (
    <div className="flex flex-col h-full bg-black min-h-0">
    <div className="flex min-h-0 w-full min-w-0 flex-1 overflow-visible bg-black">
      {/* Desktop filter sidebar */}
      <aside className="hidden lg:block w-72 border-r border-white/10 bg-black/50 flex-shrink-0">
        <FilterSidebar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSaveSearch={handleSaveSearch}
          resultCount={totalResults}
        />
      </aside>

      {/* Mobile filter drawer */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowMobileFilters(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-gray-900 shadow-xl border-r border-white/10">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="font-semibold text-white">Filters</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileFilters(false)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="h-[calc(100vh-4rem)]">
              <FilterSidebar
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onSaveSearch={handleSaveSearch}
                resultCount={totalResults}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-visible">
        {/* Search header */}
        <div
          className={cn(
            "sticky top-0 z-10 overflow-visible bg-black/80 backdrop-blur-sm border-b border-white/10 p-4 space-y-3",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300 motion-safe:delay-75 motion-reduce:animate-none"
          )}
        >
          {/* Search bar row */}
          <div className="flex items-center gap-3 overflow-visible">
            {/* Mobile filter button */}
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden flex-shrink-0 border-white/20 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setShowMobileFilters(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            {/* Search input — full width in toolbar (header magnifier adds ?focusSearch=1 to focus + highlight) */}
            <div
              className={cn(
                "relative z-[2] min-w-0 flex-1 overflow-visible rounded-xl transition-[box-shadow,transform] duration-300",
                emphasizeSearchField &&
                  "ring-2 ring-cyan-300 ring-offset-2 ring-offset-[#0a0a0a]"
              )}
              style={
                emphasizeSearchField
                  ? {
                      boxShadow:
                        "0 0 0 2px rgb(34, 211, 238), 0 0 36px rgba(34, 211, 238, 0.6)",
                    }
                  : undefined
              }
            >
              <Search className="absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-white/50" />
              <Input
                ref={searchInputRef}
                id="explore-search-input"
                type="text"
                placeholder="Search by name, company, or keywords..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className={cn(
                  "pl-9 pr-9 bg-white/5 text-white placeholder:text-white/50 focus:border-cyan-500/50",
                  emphasizeSearchField
                    ? "border-cyan-400/70"
                    : "border-white/20"
                )}
              />
              {keywords && (
                <button
                  onClick={() => setKeywords("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort select — desktop/tablet only */}
            <div className="hidden md:flex md:items-center">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-24 sm:w-36 flex-shrink-0 bg-white/5 border-white/20 text-white text-sm">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-white/20">
                  <SelectItem value="relevance" className="text-white hover:bg-white/10">Relevance</SelectItem>
                  <SelectItem value="match" className="text-white hover:bg-white/10">Match %</SelectItem>
                  <SelectItem value="name" className="text-white hover:bg-white/10">Name</SelectItem>
                  <SelectItem value="level" className="text-white hover:bg-white/10">Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View toggle */}
            <div className="hidden sm:flex items-center gap-1 rounded-full border border-white/20 p-1">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10",
                  viewMode === "grid" && "bg-white/10 text-cyan-400"
                )}
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full text-white/70 hover:text-white hover:bg-white/10",
                  viewMode === "list" && "bg-white/10 text-cyan-400"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {exploreSearchScope === "interests" && debouncedKeywords.trim() && (
            <p className="text-xs text-cyan-400/85">
              Interest search: only people who selected matching topics in their
              questionnaire.
            </p>
          )}

          {/* Active filter tags (search keyword + sidebar filters) */}
          {showActiveFiltersRow && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-white/50">Active filters:</span>
              {visibleActiveTags.map((tag, index) =>
                tag.kind === "keyword" ? (
                  <span
                    key={`keyword-${tag.value}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-violet-500/15 text-violet-300 border border-violet-500/35"
                    title="Search keyword"
                  >
                    <Search className="h-3 w-3 shrink-0 opacity-80" />
                    {tag.value}
                    <button
                      type="button"
                      onClick={clearKeywordFilter}
                      className="ml-0.5 p-0.5 hover:bg-violet-500/25 rounded-full transition-colors"
                      aria-label="Remove search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : (
                  <span
                    key={`${tag.key}-${tag.value}-${index}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  >
                    {tag.value}
                    <button
                      type="button"
                      onClick={() => {
                        const currentValues =
                          (filters[tag.key as keyof SearchFilters] as string[]) || [];
                        handleFiltersChange({
                          ...filters,
                          [tag.key]: currentValues.filter((v) => v !== tag.value),
                        });
                      }}
                      className="ml-0.5 p-0.5 hover:bg-cyan-500/20 rounded-full transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )
              )}
              {overflowTagCount > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/5 text-white/70 border border-white/10">
                  +{overflowTagCount} more
                </span>
              )}
              <button
                type="button"
                onClick={clearAllFiltersAndSearch}
                className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-white/40" />
              </div>
              <h3 className="font-semibold text-white mb-2">No attendees found</h3>
              <p className="text-white/50 max-w-md">
                Try adjusting your filters or search terms to find more connections.
              </p>
              {showActiveFiltersRow && (
                <Button
                  variant="outline"
                  onClick={clearAllFiltersAndSearch}
                  className="mt-4 border-white/20 text-white hover:bg-white/10"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Results count */}
              <p className="text-sm text-white/50 mb-1">
                Showing {results.length} of {totalResults} attendee
                {totalResults !== 1 ? "s" : ""}
              </p>
              <p className="mb-4 text-sm">
                {highAffinityOnPage > 0 ? (
                  <span className="text-[#5dc4dc]">
                    {highAffinityOnPage} high affinity match
                    {highAffinityOnPage !== 1 ? "es" : ""} on this page
                  </span>
                ) : (
                  <span className="text-white/45">
                    No high affinity matches on this page — try sorting by
                    &quot;Match strength&quot; or broadening your search.
                  </span>
                )}
              </p>

              {/* Mobile: Horizontal swipeable cards */}
              <MobileCardSwiper
                results={results}
                onRequestMeeting={handleRequestMeeting}
                onPassAttendee={handlePassAttendee}
                viewerFirstName={viewerFirstName}
              />

              {/* Desktop: Grid/List */}
              <div
                className={cn(
                  "hidden sm:block",
                  viewMode === "grid"
                    ? "sm:grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-4"
                )}
              >
                {results.map((attendee) => (
                  <AttendeeCard
                    key={attendee.user.id}
                    attendee={attendee}
                    onRequestMeeting={handleRequestMeeting}
                    onPass={handlePassAttendee}
                    viewerFirstName={viewerFirstName}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalResults > pageSize && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-white/50">
                    Page {page} of {Math.ceil(totalResults / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!hasMore}
                    className="border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
    </div>
  );
}

// Mobile swipeable cards component
function MobileCardSwiper({
  results,
  onRequestMeeting,
  onPassAttendee,
  viewerFirstName,
}: {
  results: AttendeeSearchResult[];
  onRequestMeeting: (userId: string) => void;
  onPassAttendee: (userId: string) => void;
  viewerFirstName?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const resultsKey = useMemo(
    () => results.map((r) => r.user.id).join("\0"),
    [results]
  );

  useEffect(() => {
    setActiveIndex(0);
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: 0, behavior: "auto" });
  }, [resultsKey]);

  // IntersectionObserver tracks the centered slide — iOS often under-reports scroll events
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || results.length <= 1) return;

    const mq = window.matchMedia("(max-width: 639px)");
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
  }, [resultsKey, results.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const stride = getHorizontalCarouselStride(el);
    if (stride < 8) return;
    const newIndex = Math.round(el.scrollLeft / stride);
    if (!Number.isFinite(newIndex)) return;
    const clamped = Math.min(Math.max(0, newIndex), results.length - 1);
    setActiveIndex((prev) => (prev === clamped ? prev : clamped));
  };

  if (results.length === 0) return null;

  return (
    <div className="sm:hidden -mx-4 px-4">
      {/* Card counter */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white/70">
          {activeIndex + 1} of {results.length}
        </span>
        <span className="text-xs text-white/40">Swipe to browse →</span>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex min-w-0 touch-manipulation touch-pan-x items-stretch gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain snap-x snap-mandatory pb-0 scrollbar-hide"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorX: "contain",
        }}
      >
        {results.map((attendee) => (
          <div
            key={attendee.user.id}
            data-carousel-slide
            className="flex h-[min(720px,calc(100svh-9.5rem))] w-[85vw] max-w-[340px] flex-shrink-0 snap-start flex-col"
          >
            <AttendeeCard
              attendee={attendee}
              onRequestMeeting={onRequestMeeting}
              onPass={onPassAttendee}
              viewerFirstName={viewerFirstName}
              variant="carousel"
            />
          </div>
        ))}
      </div>

      {/* Pagination dots */}
      {results.length > 1 && results.length <= 10 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {results.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const stride = getHorizontalCarouselStride(el);
                el.scrollTo({ left: stride * index, behavior: "smooth" });
              }}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? "w-6 bg-cyan-400"
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Matches the 2-at-a-time concurrency used on the dashboard; see
// enrichStartersProgressively in matches-grid.tsx for rationale
// (OpenRouter free-tier 429s trip the shared cooldown at 3).
const STARTER_ENRICH_CONCURRENCY = 2;

// Mirrors the fallback injected by /api/matches when MBA produces zero
// commonalities (see src/app/api/matches/route.ts). Keeping the shape
// identical across both callers means the starters-cache version hash
// aligns, so explore cards hit the already-persisted row from the
// dashboard instead of re-generating (and tripping the 429 cooldown).
function fallbackCommonalityDescriptions(
  title: string | undefined,
  company: string | undefined,
): string[] {
  return [
    title
      ? `${title} at ${company || "their organization"}`
      : "Fellow conference attendee",
  ];
}

async function enrichSearchStartersProgressively(
  attendees: AttendeeSearchResult[],
  setResults: React.Dispatch<React.SetStateAction<AttendeeSearchResult[]>>,
  getViewerFirstName: () => string | undefined,
  isCurrent: () => boolean,
) {
  for (let i = 0; i < attendees.length; i += STARTER_ENRICH_CONCURRENCY) {
    if (!isCurrent()) return;
    const batch = attendees.slice(i, i + STARTER_ENRICH_CONCURRENCY);
    await Promise.all(
      batch.map(async (a) => {
        try {
          const commonalityDescriptions =
            a.topCommonalities.length > 0
              ? a.topCommonalities.map((c) => c.description)
              : fallbackCommonalityDescriptions(
                  a.user.profile.title || undefined,
                  a.user.profile.company ?? undefined,
                );
          const res = await fetch(
            `/api/matches/${encodeURIComponent(a.user.id)}/starters`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userName: getViewerFirstName() || "there",
                matchName: a.user.profile.name.split(/\s+/)[0] || "them",
                matchType: a.matchType,
                commonalities: commonalityDescriptions,
                matchPosition: a.user.profile.title,
                matchCompany: a.user.profile.company ?? undefined,
                matchedUserId: a.user.id,
              }),
            },
          );
          const data = await res.json();
          const aiStarters: string[] =
            data?.success && Array.isArray(data?.data?.starters)
              ? data.data.starters
              : [];
          if (aiStarters.length === 0) return;
          if (!isCurrent()) return;
          setResults((prev) => {
            if (!isCurrent()) return prev;
            return prev.map((existing) =>
              existing.user.id !== a.user.id
                ? existing
                : { ...existing, conversationStarters: aiStarters.slice(0, 3) },
            );
          });
        } catch {
          // Network/provider errors: leave the template fallback in place.
        }
      }),
    );
  }
}
