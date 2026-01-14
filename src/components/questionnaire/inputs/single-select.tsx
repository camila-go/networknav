"use client";

import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SingleSelectProps {
  options: QuestionOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function SingleSelect({ options, value, onChange }: SingleSelectProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
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
              "relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200",
              "hover:border-cyan-400/50 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              isSelected
                ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                : "border-white/20 bg-white/5"
            )}
          >
            {/* Selection indicator */}
            <div
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                isSelected
                  ? "border-cyan-500 bg-cyan-500"
                  : "border-white/40 bg-transparent"
              )}
              aria-hidden="true"
            >
              {isSelected && <Check className="h-3 w-3 text-black" />}
            </div>

            {/* Option content */}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-white">{option.label}</span>
              {option.description && (
                <p className="text-sm text-white/60 mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

