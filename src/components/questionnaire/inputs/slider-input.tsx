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
    <div className="space-y-6">
      {/* Visual slider */}
      <div className="relative pt-2">
        {/* Track */}
        <div className="h-2 bg-navy-100 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-primary to-teal-500 rounded-full transition-all duration-300"
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
              className={cn(
                "w-4 h-4 rounded-full transition-all duration-200 -mt-1",
                "hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                index <= selectedIndex
                  ? "bg-primary shadow-md"
                  : "bg-navy-200 hover:bg-navy-300"
              )}
            />
          ))}
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs sm:text-sm">
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "text-center max-w-[100px] px-1 transition-colors",
              value === option.value
                ? "text-primary font-semibold"
                : "text-muted-foreground hover:text-navy-700"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Selected value display */}
      {value && (
        <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/20">
          <p className="font-medium text-primary">
            {options.find((opt) => opt.value === value)?.label}
          </p>
        </div>
      )}
    </div>
  );
}

