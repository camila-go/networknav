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
  const totalSteps = options.length - 1;

  return (
    <div role="slider" aria-valuemin={0} aria-valuemax={options.length - 1} aria-valuenow={selectedIndex}>
      {/* Slider container */}
      <div className="px-2">
        {/* Track and dots container */}
        <div className="relative h-5 flex items-center">
          {/* Background track - spans between first and last dot centers */}
          <div className="absolute left-2 right-2 h-1 bg-white/20 rounded-full" />
          
          {/* Active/filled track */}
          <div 
            className="absolute left-2 h-1 bg-cyan-500 rounded-full transition-all duration-300"
            style={{
              width: selectedIndex >= 0 
                ? `calc(${(selectedIndex / totalSteps) * 100}% * (100% - 16px) / 100%)` 
                : "0%",
              maxWidth: "calc(100% - 16px)"
            }}
          />

          {/* Dots */}
          <div className="relative w-full flex justify-between">
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                aria-label={option.label}
                className={cn(
                  "w-5 h-5 rounded-full transition-all duration-200 z-10",
                  "hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                  index <= selectedIndex
                    ? "bg-cyan-500 shadow-md shadow-cyan-500/30"
                    : "bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs sm:text-sm mt-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "text-center max-w-[100px] px-1 transition-colors",
                value === option.value
                  ? "text-cyan-400 font-bold"
                  : "text-white/60 hover:text-white font-medium"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selected value display */}
      {value && (
        <div className="text-center p-4 mt-6 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
          <p className="font-semibold text-cyan-400">
            {options.find((opt) => opt.value === value)?.label}
          </p>
        </div>
      )}
    </div>
  );
}

