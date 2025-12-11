"use client";

import { useState, KeyboardEvent } from "react";
import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";
import { Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface MultiSelectCustomProps {
  options: QuestionOption[];
  value: string[];
  customValues: string[];
  onChange: (value: string[]) => void;
  onCustomChange: (customValues: string[]) => void;
  minSelections?: number;
  maxSelections?: number;
  placeholder?: string;
}

export function MultiSelectCustom({
  options,
  value,
  customValues,
  onChange,
  onCustomChange,
  minSelections = 1,
  maxSelections = 10,
  placeholder = "Type to add your own...",
}: MultiSelectCustomProps) {
  const [inputValue, setInputValue] = useState("");

  const totalSelected = value.length + customValues.length;
  const isMaxSelected = totalSelected >= maxSelections;

  function handleToggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else if (!isMaxSelected) {
      onChange([...value, optionValue]);
    }
  }

  function handleAddCustom() {
    const trimmed = inputValue.trim();
    if (!trimmed || isMaxSelected) return;

    // Normalize the value for comparison
    const normalized = trimmed.toLowerCase();

    // Check if it already exists in predefined options
    const existsInOptions = options.some(
      (opt) => opt.label.toLowerCase() === normalized || opt.value === normalized
    );
    if (existsInOptions) {
      // If it matches a predefined option, select that instead
      const matchedOption = options.find(
        (opt) => opt.label.toLowerCase() === normalized || opt.value === normalized
      );
      if (matchedOption && !value.includes(matchedOption.value)) {
        onChange([...value, matchedOption.value]);
      }
      setInputValue("");
      return;
    }

    // Check if it already exists in custom values
    const existsInCustom = customValues.some(
      (cv) => cv.toLowerCase() === normalized
    );
    if (existsInCustom) {
      setInputValue("");
      return;
    }

    // Add as custom value
    onCustomChange([...customValues, trimmed]);
    setInputValue("");
  }

  function handleRemoveCustom(customValue: string) {
    onCustomChange(customValues.filter((cv) => cv !== customValue));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddCustom();
    }
  }

  return (
    <div className="space-y-4">
      {/* Selection counter */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-navy-600 font-medium">
          Selected: {totalSelected} / {maxSelections}
        </span>
        {totalSelected >= minSelections && (
          <span className="text-teal-700 font-semibold">✓ Minimum met</span>
        )}
      </div>

      {/* Custom input field */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isMaxSelected ? "Maximum reached" : placeholder}
            disabled={isMaxSelected}
            className="pr-10"
          />
          {inputValue.trim() && !isMaxSelected && (
            <button
              type="button"
              onClick={handleAddCustom}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
              aria-label="Add custom interest"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Custom values chips */}
      {customValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customValues.map((cv) => (
            <Badge
              key={cv}
              variant="secondary"
              className="bg-gradient-to-r from-primary/10 to-teal-500/10 text-primary border border-primary/20 gap-1 py-1.5 px-3 text-sm"
            >
              <span className="text-xs mr-1">✨</span>
              {cv}
              <button
                type="button"
                onClick={() => handleRemoveCustom(cv)}
                className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                aria-label={`Remove ${cv}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Predefined options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Select options">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const isDisabled = !isSelected && isMaxSelected;

          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              onClick={() => handleToggle(option.value)}
              disabled={isDisabled}
              className={cn(
                "relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200",
                isDisabled && "opacity-50 cursor-not-allowed",
                !isDisabled && "hover:border-teal-400 hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                isSelected
                  ? "border-teal-500 bg-teal-50 shadow-sm"
                  : "border-navy-200 bg-white"
              )}
            >
              {/* Icon if present */}
              {option.icon && (
                <span className="text-xl flex-shrink-0" aria-hidden="true">{option.icon}</span>
              )}

              {/* Checkbox indicator */}
              <div
                className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-teal-600 bg-teal-600"
                    : "border-navy-300 bg-white"
                )}
                aria-hidden="true"
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>

              {/* Option content */}
              <span className="font-medium text-navy-800 flex-1">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hint text */}
      <p className="text-xs text-muted-foreground text-center">
        💡 Can't find your interest? Type it above and press Enter to add it!
      </p>
    </div>
  );
}

