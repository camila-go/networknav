import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0a1628]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-cyan-500 to-teal-500 text-black",
        secondary:
          "border-transparent bg-white/10 text-white hover:bg-white/20",
        destructive:
          "border-transparent bg-red-500/20 text-red-400 hover:bg-red-500/30",
        outline: "border-white/20 text-white/80",
        success:
          "border-transparent bg-teal-500/20 text-teal-400 hover:bg-teal-500/30",
        warning:
          "border-transparent bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

