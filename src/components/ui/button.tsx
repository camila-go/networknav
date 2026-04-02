import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Primary CTA: white fill, dark text — use with `<Button />` default or custom `<a>`/`<button>`.
 * Includes focus ring tuned for a white control (not the dark page offset), hover/active depth,
 * and SVG/icon contrast (currentColor + slightly heavier stroke).
 */
export const primaryActionClasses = [
  "bg-white text-neutral-950 border border-black/12",
  "shadow-md shadow-black/10",
  "hover:bg-neutral-50 hover:border-black/20 hover:shadow-lg hover:shadow-black/20",
  "active:bg-neutral-200/95 active:border-black/25 active:shadow-sm",
  // Focus: visible on white fill; offset matches surface (overrides base dark offset via twMerge)
  "focus-visible:ring-2 focus-visible:ring-black/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  // Icons (Lucide uses currentColor + stroke)
  "[&_svg]:shrink-0 [&_svg]:text-neutral-950 [&_svg]:stroke-[2.25]",
  "[&_img]:shrink-0",
].join(" ");

/**
 * Button Component - WCAG AA Compliant
 *
 * Default (primary) is white fill with black text on dark UIs.
 * Other variants keep semantic colors (destructive, success, etc.).
 */
const buttonVariants = cva(
  [
    // Base styles
    "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold",
    // Transition
    "transition-all duration-200",
    // Focus — default ring; primary (default variant) overrides offset/color in primaryActionClasses
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1628]",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    // Active state feedback
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: primaryActionClasses,
        // Destructive - coral red
        destructive:
          "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-400 hover:to-pink-400 shadow-lg shadow-rose-500/25",
        // Outline - dark mode
        outline:
          [
            "border-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:border-white/40",
            "focus-visible:ring-white/55 focus-visible:ring-offset-[#0a1628]",
            "[&_svg]:shrink-0 [&_svg]:text-white [&_svg]:stroke-[2.25]",
          ].join(" "),
        // Secondary - dark mode
        secondary:
          [
            "bg-white/10 text-white hover:bg-white/20",
            "focus-visible:ring-white/50 focus-visible:ring-offset-[#0a1628]",
            "[&_svg]:shrink-0 [&_svg]:text-white [&_svg]:stroke-[2.25]",
          ].join(" "),
        // Ghost - dark mode
        ghost: 
          [
            "text-white/70 hover:bg-white/10 hover:text-white",
            "focus-visible:ring-white/50 focus-visible:ring-offset-[#0a1628]",
            "[&_svg]:shrink-0 [&_svg]:text-white [&_svg]:stroke-[2.25]",
          ].join(" "),
        // Link - text-only with underline
        link: 
          "rounded-full text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-300 focus-visible:ring-offset-0",
        // Success - for confirmations
        success:
          "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25",
        // Warning - for cautionary actions
        warning:
          "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25",
      },
      size: {
        default: "h-10 px-4 py-2 min-w-[44px]",
        sm: "h-9 rounded-full px-3 text-sm min-w-[44px]",
        lg: "h-12 rounded-full px-8 text-base min-w-[44px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

