"use client";

import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";

interface IconSelectProps {
  options: QuestionOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function IconSelect({ options, value, onChange }: IconSelectProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 text-center transition-all duration-200",
              "hover:border-primary/50 hover:bg-primary/5 hover:scale-105",
              isSelected
                ? "border-primary bg-primary/10 shadow-md scale-105"
                : "border-navy-100 bg-white"
            )}
          >
            {/* Icon */}
            <span className="text-3xl">{option.icon}</span>

            {/* Label */}
            <span
              className={cn(
                "font-medium text-sm",
                isSelected ? "text-primary" : "text-navy-700"
              )}
            >
              {option.label}
            </span>

            {/* Description if present */}
            {option.description && (
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            )}

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
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
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

