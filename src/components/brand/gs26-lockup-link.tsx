import Link from "next/link";
import { cn } from "@/lib/utils";

type Gs26LockupLinkProps = {
  className?: string;
  /** Default `/` for marketing; use `/dashboard` in the authenticated shell. */
  href?: string;
};

/**
 * GS26 + “Powered by JYNX” wordmark — marketing header, auth, dashboard shell, etc.
 */
export function Gs26LockupLink({ className, href = "/" }: Gs26LockupLinkProps) {
  return (
    <Link
      href={href}
      aria-label="Global Summit 2026 home"
      className={cn(
        "flex min-w-0 shrink flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3",
        className,
      )}
    >
      <span className="text-left text-lg font-bold leading-none tracking-tight text-white sm:text-2xl">
        GS26
      </span>
      <span className="text-left text-[9px] font-semibold uppercase leading-tight tracking-[0.18em] text-white/90 sm:text-[11px] sm:tracking-[0.22em]">
        Powered by JYNX
      </span>
    </Link>
  );
}
