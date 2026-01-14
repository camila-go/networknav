"use client";

import { useState, KeyboardEvent } from "react";
import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";
import { Check, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

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
        <span className="text-white/60 font-medium">
          Selected: {totalSelected} / {maxSelections}
        </span>
        {totalSelected >= minSelections && (
          <span className="text-cyan-400 font-semibold">✓ Minimum met</span>
        )}
      </div>

      {/* Custom input field */}
      <div className="flex gap-2 items-center">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isMaxSelected ? "Maximum reached" : placeholder}
          disabled={isMaxSelected}
          className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-500/50"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={!inputValue.trim() || isMaxSelected}
          className={cn(
            "flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
            inputValue.trim() && !isMaxSelected
              ? "bg-cyan-500 text-black hover:bg-cyan-400 cursor-pointer"
              : "bg-white/10 text-white/40 cursor-not-allowed"
          )}
          aria-label="Add custom interest"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Custom values chips */}
      {customValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customValues.map((cv) => (
            <span
              key={cv}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-sm font-medium"
            >
              <span aria-hidden="true">✨</span>
              {cv}
              <button
                type="button"
                onClick={() => handleRemoveCustom(cv)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 transition-colors"
                aria-label={`Remove ${cv}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                isDisabled && "opacity-50 cursor-not-allowed",
                isSelected
                  ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 focus-visible:ring-cyan-500"
                  : "border-white/20 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10 focus-visible:ring-cyan-500"
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
                    ? "border-cyan-500 bg-cyan-500"
                    : "border-white/40 bg-transparent"
                )}
                aria-hidden="true"
              >
                {isSelected && <Check className="h-3 w-3 text-black" />}
              </div>

              {/* Option content */}
              <span className="font-medium text-white flex-1">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Hint text */}
      <p className="text-xs text-white/50 text-center">
        💡 Can&apos;t find your interest? Type it above and press Enter to add it!
      </p>
    </div>
  );
}

