"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  X,
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
  archetypes: FilterOption[];
  teamQualities: FilterOption[];
  personalityTags: FilterOption[];
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
    archetypes: true,
    teamQualities: false,
    personalityTags: false,
    interests: false,
  });

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
        <div className="h-8 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/10 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            <h2 className="font-semibold text-white">Filters</h2>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10"
            >
              Clear all
            </Button>
          )}
        </div>
        {resultCount !== undefined && (
          <p className="text-sm text-white/50">
            {resultCount} attendee{resultCount !== 1 ? "s" : ""} found
          </p>
        )}
      </div>

      {/* Filter sections */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <FilterSection
            title="Archetype"
            expanded={expandedSections.archetypes}
            onToggle={() => toggleSection("archetypes")}
            activeCount={(filters.archetypes || []).length}
            onClear={() => clearFilter("archetypes")}
          >
            <FilterOptionList
              options={filterOptions.archetypes}
              selectedValues={filters.archetypes || []}
              onToggle={(value) => toggleFilter("archetypes", value)}
            />
          </FilterSection>

          <FilterSection
            title="Team strengths"
            expanded={expandedSections.teamQualities}
            onToggle={() => toggleSection("teamQualities")}
            activeCount={(filters.teamQualities || []).length}
            onClear={() => clearFilter("teamQualities")}
          >
            <FilterOptionList
              options={filterOptions.teamQualities}
              selectedValues={filters.teamQualities || []}
              onToggle={(value) => toggleFilter("teamQualities", value)}
            />
          </FilterSection>

          <FilterSection
            title="Summit style"
            expanded={expandedSections.personalityTags}
            onToggle={() => toggleSection("personalityTags")}
            activeCount={(filters.personalityTags || []).length}
            onClear={() => clearFilter("personalityTags")}
          >
            <FilterOptionList
              options={filterOptions.personalityTags}
              selectedValues={filters.personalityTags || []}
              onToggle={(value) => toggleFilter("personalityTags", value)}
            />
          </FilterSection>

          <FilterSection
            title="Tags (broad)"
            expanded={expandedSections.interests}
            onToggle={() => toggleSection("interests")}
            activeCount={(filters.interests || []).length}
            onClear={() => clearFilter("interests")}
          >
            <FilterOptionList
              options={filterOptions.interests}
              selectedValues={filters.interests || []}
              onToggle={(value) => toggleFilter("interests", value)}
            />
          </FilterSection>
        </div>
      </ScrollArea>

      {/* Save search button */}
      {onSaveSearch && activeFilterCount > 0 && (
        <div className="p-4 border-t border-white/10">
          <Button
            variant="outline"
            size="sm"
            onClick={onSaveSearch}
            className="w-full gap-2 border-white/20 text-white hover:bg-white/10"
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
    <div className="border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-white">{title}</span>
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="bg-cyan-500 text-black text-xs h-5 min-w-[20px]"
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
              className="p-1 hover:bg-white/10 rounded-full"
              aria-label={`Clear ${title} filters`}
            >
              <X className="h-3 w-3 text-white/50" />
            </button>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-white/50" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/50" />
          )}
        </div>
      </button>
      {expanded && <div className="p-3 pt-2 bg-black/30">{children}</div>}
    </div>
  );
}

interface FilterOptionListProps {
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

function FilterOptionList({
  options,
  selectedValues,
  onToggle,
}: FilterOptionListProps) {
  return (
    <div className="space-y-2">
      <div className="max-h-48 overflow-y-auto space-y-1">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-full text-sm text-left transition-colors",
                isSelected
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "hover:bg-white/10 text-white/70"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                  isSelected
                    ? "bg-cyan-500 border-cyan-500"
                    : "border-white/30"
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-black"
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
        {options.length === 0 && (
          <p className="text-sm text-white/50 text-center py-2">
            No options available
          </p>
        )}
      </div>
    </div>
  );
}
