"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Sparkles, User, LogOut, Search, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";

const navItems = [
  { href: "/dashboard", label: "Matches", icon: Sparkles },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/meetings", label: "Meetings", icon: Calendar },
  { href: "/profile", label: "Profile", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-navy-900 hidden sm:inline">
            Jynx
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    isActive && "bg-primary/10 text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          <div className="mx-1">
            <NotificationBell />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-foreground ml-1"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}

