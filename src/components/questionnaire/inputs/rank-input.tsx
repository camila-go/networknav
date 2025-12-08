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
    <div className="space-y-6">
      {/* Selected items (ranked) */}
      {selectedOptions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-navy-700">
            Your ranking (drag to reorder):
          </h4>
          <div className="space-y-2">
            {selectedOptions.map((option, index) => (
              <div
                key={option.value}
                className="flex items-center gap-3 p-4 bg-primary/10 border-2 border-primary rounded-xl"
              >
                {/* Rank number */}
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {index + 1}
                </div>

                {/* Icon and label */}
                {option.icon && <span className="text-xl">{option.icon}</span>}
                <span className="flex-1 font-medium text-navy-800">
                  {option.label}
                </span>

                {/* Move buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className={cn(
                      "p-1 rounded hover:bg-primary/20 transition-colors",
                      index === 0 && "opacity-30 cursor-not-allowed"
                    )}
                    title="Move up"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                      "p-1 rounded hover:bg-primary/20 transition-colors",
                      index === selectedOptions.length - 1 &&
                        "opacity-30 cursor-not-allowed"
                    )}
                    title="Move down"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                  className="p-1 text-navy-400 hover:text-destructive transition-colors"
                  title="Remove"
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
          <h4 className="text-sm font-medium text-muted-foreground">
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
                  "border-navy-100 bg-white hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                {option.icon && <span className="text-xl">{option.icon}</span>}
                <span className="font-medium text-navy-700">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completion status */}
      {value.length === maxSelections && (
        <div className="text-center text-sm text-teal-600 font-medium">
          ✓ Top {maxSelections} selected
        </div>
      )}
    </div>
  );
}

