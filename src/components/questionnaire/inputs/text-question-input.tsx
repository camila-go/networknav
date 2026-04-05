"use client";

import { cn } from "@/lib/utils";

interface TextQuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function TextQuestionInput({
  value,
  onChange,
  placeholder,
  multiline,
}: TextQuestionInputProps) {
  const className = cn(
    "w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-[15px] text-zinc-100",
    "placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
  );

  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className={cn(className, "min-h-[120px] resize-y")}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
