"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterSidebar } from "./filter-sidebar";
import { AttendeeCard } from "./attendee-card";
import { ExploreFeedTab } from "./explore-feed-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/components/ui/use-toast";
import type { SearchFilters, AttendeeSearchResult } from "@/types";

function exploreStateFromSearchParams(
  sp: ReturnType<typeof useSearchParams>
): { tab: "feed" | "search"; keywords: string } {
  const q = sp.get("q")?.trim() ?? "";
  const tab: "feed" | "search" =
    q.length > 0 || sp.get("tab") === "search" ? "search" : "feed";
  return { tab, keywords: q };
}

export function ExploreContainer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const initialExplore = exploreStateFromSearchParams(searchParams);
  const [activeTab, setActiveTab] = useState<"feed" | "search">(initialExplore.tab);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [keywords, setKeywords] = useState(initialExplore.keywords);
  const [debouncedKeywords, setDebouncedKeywords] = useState(
    initialExplore.keywords
  );
  const [results, setResults] = useState<AttendeeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"relevance" | "match" | "name" | "level">("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [viewerFirstName, setViewerFirstName] = useState<string | undefined>();

  const pageSize = 12;

  const exploreSearchScope = useMemo((): "all" | "interests" => {
    return searchParams.get("scope") === "interests" ? "interests" : "all";
  }, [searchParams]);

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
    if (q || searchParams.get("tab") === "search") {
      setActiveTab("search");
      if (q) {
        setKeywords(q);
        setDebouncedKeywords(q);
      }
    }
  }, [searchParams]);

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
        setResults(result.data.results);
        setTotalResults(result.data.total);
        setHasMore(result.data.hasMore);
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
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "feed" | "search")}
      className="flex flex-col h-full bg-black min-h-0"
    >
      <div className="flex-shrink-0 z-20 w-full border-b border-white/10 bg-gradient-to-b from-zinc-900/95 to-black">
        <TabsList className="grid w-full grid-cols-2 h-12 sm:h-14 rounded-none border-0 bg-transparent p-0 gap-0">
          <TabsTrigger
            value="feed"
            className="rounded-none border-0 border-r border-white/10 data-[state=active]:bg-teal-500/15 data-[state=active]:text-teal-300 data-[state=active]:shadow-[inset_0_-3px_0_0_rgba(45,212,191,0.9)] text-white/55 data-[state=inactive]:hover:bg-white/5 text-sm sm:text-base font-medium"
          >
            Feed
          </TabsTrigger>
          <TabsTrigger
            value="search"
            className="rounded-none border-0 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300 data-[state=active]:shadow-[inset_0_-3px_0_0_rgba(34,211,238,0.9)] text-white/55 data-[state=inactive]:hover:bg-white/5 text-sm sm:text-base font-medium"
          >
            Search
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent
        value="feed"
        className="flex-1 min-h-0 m-0 p-0 border-0 outline-none data-[state=inactive]:hidden overflow-y-auto overflow-x-hidden"
      >
        <ExploreFeedTab />
      </TabsContent>

      <TabsContent
        value="search"
        className="flex-1 flex min-h-0 m-0 p-0 border-0 outline-none data-[state=inactive]:hidden overflow-hidden"
      >
    <div className="flex h-full min-h-0 w-full bg-black">
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
      <main className="flex-1 flex flex-col min-w-0">
        {/* Search header */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-white/10 p-4 space-y-3">
          {/* Search bar row */}
          <div className="flex items-center gap-3">
            {/* Mobile filter button */}
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden flex-shrink-0 border-white/20 text-white/70 hover:text-white hover:bg-white/10"
              onClick={() => setShowMobileFilters(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                type="text"
                placeholder="Search by name, company, or keywords..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="pl-9 pr-9 bg-white/5 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-500/50"
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

            {/* Sort select */}
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
              <p className="text-sm text-white/50 mb-4">
                Showing {results.length} of {totalResults} attendee
                {totalResults !== 1 ? "s" : ""}
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
      </TabsContent>
    </Tabs>
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

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = scrollRef.current.offsetWidth * 0.85 + 16;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, results.length - 1));
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
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide scroll-smooth"
      >
        {results.map((attendee) => (
          <div
            key={attendee.user.id}
            className="flex-shrink-0 w-[85vw] max-w-[340px] snap-start"
          >
            <AttendeeCard
              attendee={attendee}
              onRequestMeeting={onRequestMeeting}
              onPass={onPassAttendee}
              viewerFirstName={viewerFirstName}
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
  );
}
