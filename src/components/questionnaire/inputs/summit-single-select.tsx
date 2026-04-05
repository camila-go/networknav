"use client";

import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface SummitSingleSelectProps {
  options: QuestionOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  /** Last row: "Something else" opens custom — optional */
  allowCustom?: boolean;
  customValue?: string;
  onCustomChange?: (value: string) => void;
}

export function SummitSingleSelect({
  options,
  value,
  onChange,
  allowCustom,
  customValue,
  onCustomChange,
}: SummitSingleSelectProps) {
  const showCustomRow = allowCustom && onCustomChange;
  const customSelected = value === "__custom__";

  return (
    <div className="flex flex-col" role="radiogroup">
      {options.map((option, index) => {
        const n = index + 1;
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
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
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400"
              )}
            >
              {n}
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

      {showCustomRow && (
        <div className="border-b border-white/[0.08] py-3">
          <button
            type="button"
            role="radio"
            aria-checked={customSelected}
            onClick={() => onChange("__custom__")}
            className={cn(
              "flex w-full items-center gap-4 px-1 text-left transition-colors",
              "hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-inset"
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                customSelected ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-500"
              )}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span
              className={cn(
                "text-[15px]",
                customSelected ? "text-zinc-100" : "text-zinc-400"
              )}
            >
              Something else
            </span>
          </button>
          {customSelected && (
            <input
              type="text"
              value={customValue || ""}
              onChange={(e) => onCustomChange(e.target.value)}
              placeholder="Type your answer"
              className={cn(
                "mt-3 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-zinc-100",
                "placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
