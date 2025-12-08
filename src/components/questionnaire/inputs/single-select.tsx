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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200",
              "hover:border-primary/50 hover:bg-primary/5",
              isSelected
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-navy-100 bg-white"
            )}
          >
            {/* Selection indicator */}
            <div
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                isSelected
                  ? "border-primary bg-primary"
                  : "border-navy-200 bg-white"
              )}
            >
              {isSelected && <Check className="h-3 w-3 text-white" />}
            </div>

            {/* Option content */}
            <div className="flex-1 min-w-0">
              <span className="font-medium text-navy-800">{option.label}</span>
              {option.description && (
                <p className="text-sm text-muted-foreground mt-0.5">
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

