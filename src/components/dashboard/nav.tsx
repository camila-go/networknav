"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Sparkles, User, LogOut, Search, Calendar, Network, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navItems = [
  { href: "/dashboard", label: "Matches", icon: Sparkles },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/network", label: "Network", icon: Network },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="font-bold text-black text-sm">J</span>
          </div>
          <span className="font-display text-lg font-bold text-white hidden sm:inline tracking-wide">
            JYNX
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-cyan-500/20 text-cyan-400" 
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              </Link>
            );
          })}

          <div className="mx-1">
            <NotificationBell />
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all ml-1"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

