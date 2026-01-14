"use client";

import { useState } from "react";
import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";
import { GripVertical, X } from "lucide-react";

interface RankInputProps {
  options: QuestionOption[];
  value: string[];
  onChange: (value: string[]) => void;
  maxSelections: number;
}

export function RankInput({
  options,
  value,
  onChange,
  maxSelections,
}: RankInputProps) {
  const selectedOptions = value
    .map((v) => options.find((opt) => opt.value === v))
    .filter(Boolean) as QuestionOption[];
  const availableOptions = options.filter((opt) => !value.includes(opt.value));

  function handleSelect(optionValue: string) {
    if (value.length < maxSelections) {
      onChange([...value, optionValue]);
    }
  }

  function handleRemove(optionValue: string) {
    onChange(value.filter((v) => v !== optionValue));
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const newValue = [...value];
    [newValue[index - 1], newValue[index]] = [
      newValue[index],
      newValue[index - 1],
    ];
    onChange(newValue);
  }

  function handleMoveDown(index: number) {
    if (index === value.length - 1) return;
    const newValue = [...value];
    [newValue[index], newValue[index + 1]] = [
      newValue[index + 1],
      newValue[index],
    ];
    onChange(newValue);
  }

  return (
    <div className="space-y-6" role="listbox" aria-label="Rank your selections">
      {/* Selected items (ranked) */}
      {selectedOptions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white/80">
            Your ranking (use arrows to reorder):
          </h4>
          <div className="space-y-2" role="list">
            {selectedOptions.map((option, index) => (
              <div
                key={option.value}
                role="listitem"
                className="flex items-center gap-3 p-4 bg-cyan-500/10 border-2 border-cyan-500 rounded-xl"
              >
                {/* Rank number */}
                <div className="w-8 h-8 rounded-full bg-cyan-500 text-black flex items-center justify-center font-bold" aria-label={`Rank ${index + 1}`}>
                  {index + 1}
                </div>

                {/* Icon and label */}
                {option.icon && <span className="text-xl" aria-hidden="true">{option.icon}</span>}
                <span className="flex-1 font-medium text-white">
                  {option.label}
                </span>

                {/* Move buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={cn(
                      "p-2 rounded text-white/60 hover:bg-white/10 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500",
                      index === 0 && "opacity-30 cursor-not-allowed"
                    )}
                    aria-label="Move up"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === selectedOptions.length - 1}
                    className={cn(
                      "p-2 rounded text-white/60 hover:bg-white/10 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500",
                      index === selectedOptions.length - 1 &&
                        "opacity-30 cursor-not-allowed"
                    )}
                    aria-label="Move down"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(option.value)}
                  className="p-2 text-white/60 hover:text-coral-400 transition-colors focus-visible:ring-2 focus-visible:ring-coral-500"
                  aria-label={`Remove ${option.label}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available options */}
      {availableOptions.length > 0 && value.length < maxSelections && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white/60">
            Select {maxSelections - value.length} more:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200",
                  "border-white/20 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                )}
              >
                {option.icon && <span className="text-xl" aria-hidden="true">{option.icon}</span>}
                <span className="font-medium text-white">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completion status */}
      {value.length === maxSelections && (
        <div className="text-center text-sm text-cyan-400 font-semibold" role="status">
          ✓ Top {maxSelections} selected
        </div>
      )}
    </div>
  );
}

