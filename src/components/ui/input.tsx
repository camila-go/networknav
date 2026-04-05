import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

function assignRef<T>(
  ref: React.Ref<T> | undefined,
  value: T | null
): void {
  if (ref == null) return;
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  try {
    (ref as React.MutableRefObject<T | null>).current = value;
  } catch {
    // ignore
  }
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, forwardedRef) => {
    const { ref: fromProps, ...rest } = props as InputProps & {
      ref?: React.Ref<HTMLInputElement>;
    };

    return (
      <input
        className={cn(
          "flex h-10 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white ring-offset-[#0a1628] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          className
        )}
        {...rest}
        ref={(node) => {
          assignRef(fromProps, node);
          assignRef(forwardedRef, node);
        }}
        // After spread + merged ref so password ↔ text toggles always win
        type={type}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

