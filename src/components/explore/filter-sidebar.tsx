"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Filter,
  Save,
} from "lucide-react";
import type { SearchFilters } from "@/types";

interface FilterOption {
  value: string;
  label: string;
  icon?: string;
  category?: string;
}

interface FilterOptions {
  industries: FilterOption[];
  leadershipLevels: FilterOption[];
  organizationSizes: FilterOption[];
  yearsExperience: FilterOption[];
  leadershipChallenges: FilterOption[];
  leadershipPriorities: FilterOption[];
  interests: FilterOption[];
}

interface FilterSidebarProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onSaveSearch?: () => void;
  resultCount?: number;
}

export function FilterSidebar({
  filters,
  onFiltersChange,
  onSaveSearch,
  resultCount,
}: FilterSidebarProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    industries: true,
    leadershipLevels: true,
    leadershipChallenges: false,
    interests: false,
  });
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  async function fetchFilterOptions() {
    try {
      const response = await fetch("/api/attendees/search");
      const result = await response.json();
      if (result.success) {
        setFilterOptions(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  }

  function toggleSection(section: string) {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function toggleFilter(
    filterKey: keyof SearchFilters,
    value: string
  ) {
    const currentValues = (filters[filterKey] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onFiltersChange({
      ...filters,
      [filterKey]: newValues.length > 0 ? newValues : undefined,
    });
  }

  function clearAllFilters() {
    onFiltersChange({});
  }

  function clearFilter(filterKey: keyof SearchFilters) {
    const newFilters = { ...filters };
    delete newFilters[filterKey];
    onFiltersChange(newFilters);
  }

  const activeFilterCount = Object.values(filters).filter(
    (v) => v && (Array.isArray(v) ? v.length > 0 : v !== "")
  ).length;

  if (!filterOptions) {
    return (
      <div className="w-full p-4 animate-pulse">
        <div className="h-8 bg-navy-100 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-navy-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-navy-900">Filters</h2>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          )}
        </div>
        {resultCount !== undefined && (
          <p className="text-sm text-muted-foreground">
            {resultCount} attendee{resultCount !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Filter sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Industry */}
          <FilterSection
            title="Industry"
            expanded={expandedSections.industries}
            onToggle={() => toggleSection("industries")}
            activeCount={(filters.industries || []).length}
            onClear={() => clearFilter("industries")}
          >
            <FilterOptionList
              options={filterOptions.industries}
              selectedValues={filters.industries || []}
              onToggle={(value) => toggleFilter("industries", value)}
              searchQuery={searchQueries.industries}
              onSearchChange={(q) =>
                setSearchQueries((prev) => ({ ...prev, industries: q }))
              }
              showSearch
            />
          </FilterSection>

          {/* Leadership Level */}
          <FilterSection
            title="Leadership Level"
            expanded={expandedSections.leadershipLevels}
            onToggle={() => toggleSection("leadershipLevels")}
            activeCount={(filters.leadershipLevels || []).length}
            onClear={() => clearFilter("leadershipLevels")}
          >
            <FilterOptionList
              options={filterOptions.leadershipLevels}
              selectedValues={filters.leadershipLevels || []}
              onToggle={(value) => toggleFilter("leadershipLevels", value)}
            />
          </FilterSection>

          {/* Organization Size */}
          <FilterSection
            title="Organization Size"
            expanded={expandedSections.organizationSizes}
            onToggle={() => toggleSection("organizationSizes")}
            activeCount={(filters.organizationSizes || []).length}
            onClear={() => clearFilter("organizationSizes")}
          >
            <FilterOptionList
              options={filterOptions.organizationSizes}
              selectedValues={filters.organizationSizes || []}
              onToggle={(value) => toggleFilter("organizationSizes", value)}
            />
          </FilterSection>

          {/* Years Experience */}
          <FilterSection
            title="Years in Leadership"
            expanded={expandedSections.yearsExperience}
            onToggle={() => toggleSection("yearsExperience")}
            activeCount={(filters.yearsExperience || []).length}
            onClear={() => clearFilter("yearsExperience")}
          >
            <FilterOptionList
              options={filterOptions.yearsExperience}
              selectedValues={filters.yearsExperience || []}
              onToggle={(value) => toggleFilter("yearsExperience", value)}
            />
          </FilterSection>

          {/* Leadership Challenges */}
          <FilterSection
            title="Leadership Challenges"
            expanded={expandedSections.leadershipChallenges}
            onToggle={() => toggleSection("leadershipChallenges")}
            activeCount={(filters.leadershipChallenges || []).length}
            onClear={() => clearFilter("leadershipChallenges")}
          >
            <FilterOptionList
              options={filterOptions.leadershipChallenges}
              selectedValues={filters.leadershipChallenges || []}
              onToggle={(value) => toggleFilter("leadershipChallenges", value)}
              searchQuery={searchQueries.leadershipChallenges}
              onSearchChange={(q) =>
                setSearchQueries((prev) => ({ ...prev, leadershipChallenges: q }))
              }
              showSearch
            />
          </FilterSection>

          {/* Leadership Priorities */}
          <FilterSection
            title="Leadership Priorities"
            expanded={expandedSections.leadershipPriorities}
            onToggle={() => toggleSection("leadershipPriorities")}
            activeCount={(filters.leadershipPriorities || []).length}
            onClear={() => clearFilter("leadershipPriorities")}
          >
            <FilterOptionList
              options={filterOptions.leadershipPriorities}
              selectedValues={filters.leadershipPriorities || []}
              onToggle={(value) => toggleFilter("leadershipPriorities", value)}
              searchQuery={searchQueries.leadershipPriorities}
              onSearchChange={(q) =>
                setSearchQueries((prev) => ({ ...prev, leadershipPriorities: q }))
              }
              showSearch
            />
          </FilterSection>

          {/* Interests */}
          <FilterSection
            title="Interests & Hobbies"
            expanded={expandedSections.interests}
            onToggle={() => toggleSection("interests")}
            activeCount={(filters.interests || []).length}
            onClear={() => clearFilter("interests")}
          >
            <FilterOptionList
              options={filterOptions.interests}
              selectedValues={filters.interests || []}
              onToggle={(value) => toggleFilter("interests", value)}
              searchQuery={searchQueries.interests}
              onSearchChange={(q) =>
                setSearchQueries((prev) => ({ ...prev, interests: q }))
              }
              showSearch
            />
          </FilterSection>
        </div>
      </ScrollArea>

      {/* Save search button */}
      {onSaveSearch && activeFilterCount > 0 && (
        <div className="p-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveSearch}
            className="w-full gap-2"
          >
            <Save className="h-4 w-4" />
            Save this search
          </Button>
        </div>
      )}
    </div>
  );
}

interface FilterSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  activeCount: number;
  onClear: () => void;
  children: React.ReactNode;
}

function FilterSection({
  title,
  expanded,
  onToggle,
  activeCount,
  onClear,
  children,
}: FilterSectionProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-navy-50/50 hover:bg-navy-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-navy-800">{title}</span>
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-primary text-white text-xs h-5 min-w-[20px]"
            >
              {activeCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {activeCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 hover:bg-navy-100 rounded"
              aria-label={`Clear ${title} filters`}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && <div className="p-3 pt-2 bg-white">{children}</div>}
    </div>
  );
}

interface FilterOptionListProps {
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
}

function FilterOptionList({
  options,
  selectedValues,
  onToggle,
  searchQuery = "",
  onSearchChange,
  showSearch = false,
}: FilterOptionListProps) {
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {showSearch && options.length > 6 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="h-8 pl-7 text-sm"
          />
        </div>
      )}
      <div className="max-h-48 overflow-y-auto space-y-1">
        {filteredOptions.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors",
                isSelected
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-navy-50 text-navy-700"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                  isSelected
                    ? "bg-primary border-primary"
                    : "border-navy-200"
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              {option.icon && <span className="text-sm">{option.icon}</span>}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
        {filteredOptions.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No options found
          </p>
        )}
      </div>
    </div>
  );
}

