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
              "hover:border-cyan-400/50 hover:bg-white/10 hover:scale-105 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              isSelected
                ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20 scale-105"
                : "border-white/20 bg-white/5"
            )}
          >
            {/* Icon */}
            <span className="text-3xl" aria-hidden="true">{option.icon}</span>

            {/* Label */}
            <span
              className={cn(
                "font-semibold text-sm",
                isSelected ? "text-cyan-400" : "text-white"
              )}
            >
              {option.label}
            </span>

            {/* Description if present */}
            {option.description && (
              <span className="text-xs text-white/60">
                {option.description}
              </span>
            )}

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center" aria-hidden="true">
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
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

