"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Search, Network, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Matches", icon: Sparkles },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/network", label: "Network", icon: Network },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-full transition-all min-h-[56px]",
                isActive
                  ? "text-cyan-400"
                  : "text-white/60 active:text-white active:bg-white/10"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", isActive && "drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]")} />
              <span className="text-[10px] font-medium truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
