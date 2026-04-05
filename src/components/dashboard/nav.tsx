"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  User,
  LogOut,
  Search,
  Network,
  Shield,
  GalleryThumbnails,
} from "lucide-react";
import { Gs26LockupLink } from "@/components/brand/gs26-lockup-link";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { MobileSearchNavButton } from "@/components/explore/explore-mobile-header-search";
import type { UserRole } from "@/types";

const navItems = [
  { href: "/dashboard", label: "Matches", icon: Sparkles },
  { href: "/explore", label: "Search", icon: Search },
  { href: "/gallery", label: "Gallery", icon: GalleryThumbnails },
  { href: "/network", label: "Network", icon: Network },
  { href: "/profile", label: "Profile", icon: User },
];

export function DashboardNav() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole>("user");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.user?.role) {
          setUserRole(res.data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  const isAdminOrMod = userRole === "admin" || userRole === "moderator";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Gs26LockupLink
          href="/dashboard"
          className="max-w-[min(100%,14rem)] shrink-0 sm:max-w-none"
        />

        <nav className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <MobileSearchNavButton />
          {/* Desktop navigation — lg+ only; tablet uses bottom nav + compact header like mobile */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all",
                    isActive
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {isAdminOrMod && (
              <Link
                href="/admin"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all",
                  pathname.startsWith("/admin")
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-amber-400/70 hover:bg-white/10 hover:text-amber-400"
                )}
              >
                <Shield className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          <div className="mx-1">
            <NotificationBell />
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all ml-1"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Log out</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

