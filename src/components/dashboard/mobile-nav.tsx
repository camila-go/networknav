"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Network, User, GalleryThumbnails } from "lucide-react";
import { cn } from "@/lib/utils";

/** Search (/explore) is opened from the header magnifier on mobile, not the bottom bar. */
const navItems = [
  { href: "/dashboard", label: "Matches", icon: Sparkles },
  { href: "/gallery", label: "Gallery", icon: GalleryThumbnails },
  { href: "/network", label: "Network", icon: Network },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-16 items-center justify-around gap-0.5 px-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "press group relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 py-2 transition-colors duration-200 ease-out",
                isActive
                  ? "text-cyan-400"
                  : "text-white/60 active:text-white active:bg-white/10"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-transform duration-300 ease-out sm:h-5 sm:w-5",
                  isActive
                    ? "scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                    : "group-hover:scale-105 group-active:scale-95"
                )}
              />
              <span className="max-w-full truncate text-[9px] font-medium transition-opacity duration-200 sm:text-[10px]">
                {item.label}
              </span>
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute -top-px h-[2px] w-6 rounded-full bg-cyan-400 transition-all duration-300 ease-out",
                  isActive ? "opacity-100 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "opacity-0 -translate-y-0.5"
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
