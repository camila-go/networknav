"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXPLORE_SEARCH_FOCUS_EVENT,
  EXPLORE_SEARCH_FOCUS_STORAGE_KEY,
} from "@/lib/explore-search-focus";

/**
 * Mobile-only: magnifier next to notifications.
 * From other routes: sessionStorage + navigate to /explore (ExploreContainer reads on mount).
 * Already on /explore: prevent navigation and dispatch a window event (URL query is unreliable with soft nav).
 */
export function MobileSearchNavButton() {
  const pathname = usePathname();
  const isSearch =
    pathname === "/explore" || pathname.startsWith("/explore/");

  return (
    <Link
      href="/explore"
      onClick={(e) => {
        try {
          sessionStorage.setItem(EXPLORE_SEARCH_FOCUS_STORAGE_KEY, "1");
        } catch {
          /* private mode */
        }
        if (isSearch) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent(EXPLORE_SEARCH_FOCUS_EVENT));
        }
      }}
      className={cn(
        "lg:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/80 transition-all",
        "hover:border-white/35 hover:bg-white/10 hover:text-white",
        "active:scale-[0.97]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-reduce:animate-none",
        isSearch &&
          "border-cyan-500/40 bg-cyan-500/15 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/20 hover:text-cyan-200"
      )}
      aria-label="Open search"
      aria-current={isSearch ? "page" : undefined}
    >
      <Search className="h-4 w-4" strokeWidth={2.25} aria-hidden />
    </Link>
  );
}
