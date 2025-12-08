"use client";

import type { QuestionOption } from "@/types";
import { cn } from "@/lib/utils";

interface SliderInputProps {
  options: QuestionOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function SliderInput({ options, value, onChange }: SliderInputProps) {
  const selectedIndex = options.findIndex((opt) => opt.value === value);

  return (
    <div className="space-y-6" role="slider" aria-valuemin={0} aria-valuemax={options.length - 1} aria-valuenow={selectedIndex}>
      {/* Visual slider */}
      <div className="relative pt-2">
        {/* Track */}
        <div className="h-2 bg-navy-200 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-300"
            style={{
              width:
                selectedIndex >= 0
                  ? `${((selectedIndex + 1) / options.length) * 100}%`
                  : "0%",
            }}
          />
        </div>

        {/* Dots */}
        <div className="absolute inset-x-0 top-1 flex justify-between">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-label={option.label}
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-200 -mt-1",
                "hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                index <= selectedIndex
                  ? "bg-teal-600 shadow-md"
                  : "bg-navy-300 hover:bg-navy-400"
              )}
            />
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs sm:text-sm">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "text-center max-w-[100px] px-1 transition-colors",
              value === option.value
                ? "text-teal-700 font-bold"
                : "text-navy-600 hover:text-navy-800 font-medium"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Selected value display */}
      {value && (
        <div className="text-center p-4 bg-teal-50 rounded-xl border border-teal-200">
          <p className="font-semibold text-teal-700">
            {options.find((opt) => opt.value === value)?.label}
          </p>
        </div>
      )}
    </div>
  );
}

