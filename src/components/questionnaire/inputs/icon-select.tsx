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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" role="radiogroup">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 text-center transition-all duration-200",
              "hover:border-teal-400 hover:bg-teal-50 hover:scale-105 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
              isSelected
                ? "border-teal-500 bg-teal-50 shadow-md scale-105"
                : "border-navy-200 bg-white"
            )}
          >
            {/* Icon */}
            <span className="text-3xl" aria-hidden="true">{option.icon}</span>

            {/* Label */}
            <span
              className={cn(
                "font-semibold text-sm",
                isSelected ? "text-teal-700" : "text-navy-700"
              )}
            >
              {option.label}
            </span>

            {/* Description if present */}
            {option.description && (
              <span className="text-xs text-navy-600">
                {option.description}
              </span>
            )}

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center" aria-hidden="true">
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

