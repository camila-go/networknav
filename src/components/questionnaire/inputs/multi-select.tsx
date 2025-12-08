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
        <span className="text-muted-foreground">
          Selected: {value.length} / {maxSelections}
        </span>
        {value.length >= minSelections && (
          <span className="text-teal-600 font-medium">✓ Minimum met</span>
        )}
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value.includes(option.value);
          const isDisabled = !isSelected && isMaxSelected;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              disabled={isDisabled}
              className={cn(
                "relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200",
                isDisabled && "opacity-50 cursor-not-allowed",
                !isDisabled && "hover:border-primary/50 hover:bg-primary/5",
                isSelected
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-navy-100 bg-white"
              )}
            >
              {/* Icon if present */}
              {option.icon && (
                <span className="text-xl flex-shrink-0">{option.icon}</span>
              )}

              {/* Checkbox indicator */}
              <div
                className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors",
                  isSelected
                    ? "border-primary bg-primary"
                    : "border-navy-200 bg-white"
                )}
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

