"use client";

import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SummitMultiSelectProps {
  options: QuestionOption[];
  value: string[];
  onChange: (value: string[]) => void;
  minSelections?: number;
  maxSelections?: number;
}

export function SummitMultiSelect({
  options,
  value,
  onChange,
  minSelections: _min,
  maxSelections,
}: SummitMultiSelectProps) {
  function toggle(v: string) {
    const has = value.includes(v);
    if (has) {
      onChange(value.filter((x) => x !== v));
      return;
    }
    if (maxSelections && value.length >= maxSelections) {
      onChange([...value.slice(1), v]);
      return;
    }
    onChange([...value, v]);
  }

  return (
    <div className="flex flex-col">
      {options.map((option, index) => {
        const n = index + 1;
        const isSelected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggle(option.value)}
            className={cn(
              "flex w-full items-center gap-4 px-1 py-3.5 text-left transition-colors",
              "border-b border-white/[0.08] last:border-b-0",
              "hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-inset"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                isSelected
                  ? "bg-cyan-500/90 text-black"
                  : "bg-zinc-800 text-zinc-400"
              )}
            >
              {isSelected ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
            </span>
            <span
              className={cn(
                "text-[15px] leading-snug",
                isSelected ? "text-zinc-100" : "text-zinc-400"
              )}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
