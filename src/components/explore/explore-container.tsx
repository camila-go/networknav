"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
import type { SearchFilters, AttendeeSearchResult } from "@/types";

export function ExploreContainer() {
  const router = useRouter();
  const { toast } = useToast();

  const [filters, setFilters] = useState<SearchFilters>({});
  const [keywords, setKeywords] = useState("");
  const [debouncedKeywords, setDebouncedKeywords] = useState("");
  const [results, setResults] = useState<AttendeeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"relevance" | "match" | "name" | "level">("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const pageSize = 12;

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
  }, [filters, debouncedKeywords, page, pageSize, sortBy, toast]);

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

  function handleSaveSearch() {
    toast({
      title: "Search saved!",
      description: "You'll be notified when new attendees match your criteria.",
    });
  }

  // Get active filter tags for display
  const activeFilterTags = Object.entries(filters)
    .filter(([, value]) => value && (Array.isArray(value) ? value.length > 0 : value !== ""))
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((v) => ({ key, value: v }));
      }
      return [{ key, value: value as string }];
    });

  return (
    <div className="flex h-full bg-black">
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
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-gray-900 shadow-xl border-r border-white/10">
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
              <SelectTrigger className="w-36 flex-shrink-0 bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="relevance" className="text-white hover:bg-white/10">Relevance</SelectItem>
                <SelectItem value="match" className="text-white hover:bg-white/10">Match %</SelectItem>
                <SelectItem value="name" className="text-white hover:bg-white/10">Name</SelectItem>
                <SelectItem value="level" className="text-white hover:bg-white/10">Level</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="hidden sm:flex items-center border border-white/20 rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-r-none text-white/70 hover:text-white hover:bg-white/10",
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
                  "h-9 w-9 rounded-l-none text-white/70 hover:text-white hover:bg-white/10",
                  viewMode === "list" && "bg-white/10 text-cyan-400"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Active filter tags */}
          {activeFilterTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-white/50">Active filters:</span>
              {activeFilterTags.slice(0, 5).map(({ key, value }, index) => (
                <span
                  key={`${key}-${value}-${index}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                >
                  {value}
                  <button
                    onClick={() => {
                      const currentValues = (filters[key as keyof SearchFilters] as string[]) || [];
                      handleFiltersChange({
                        ...filters,
                        [key]: currentValues.filter((v) => v !== value),
                      });
                    }}
                    className="ml-0.5 p-0.5 hover:bg-cyan-500/20 rounded-full transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {activeFilterTags.length > 5 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/5 text-white/70 border border-white/10">
                  +{activeFilterTags.length - 5} more
                </span>
              )}
              <button
                onClick={() => setFilters({})}
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
              {activeFilterTags.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({});
                    setKeywords("");
                  }}
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

              {/* Grid/List */}
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                    : "space-y-4"
                )}
              >
                {results.map((attendee) => (
                  <AttendeeCard
                    key={attendee.user.id}
                    attendee={attendee}
                    onRequestMeeting={handleRequestMeeting}
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
  );
}
