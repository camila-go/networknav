"use client";

import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MultiSelectProps {
  options: QuestionOption[];
  value: string[];
  onChange: (value: string[]) => void;
  minSelections?: number;
  maxSelections?: number;
}

export function MultiSelect({
  options,
  value,
  onChange,
  minSelections = 1,
  maxSelections = 5,
}: MultiSelectProps) {
  function handleToggle(optionValue: string) {
    if (value.includes(optionValue)) {
      // Remove if already selected
      onChange(value.filter((v) => v !== optionValue));
    } else if (value.length < maxSelections) {
      // Add if under max
      onChange([...value, optionValue]);
    }
  }

  const isMaxSelected = value.length >= maxSelections;

  return (
    <div className="space-y-4">
      {/* Selection counter */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-navy-600 font-medium">
          Selected: {value.length} / {maxSelections}
        </span>
        {value.length >= minSelections && (
          <span className="text-teal-700 font-semibold">✓ Minimum met</span>
        )}
      </div>

      {/* Options grid */}
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
    </div>
  );
}

