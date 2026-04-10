"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Shield, ArrowLeft, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface AdminSidebarProps {
  role: UserRole;
}

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
    minRole: "moderator" as const,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
    minRole: "admin" as const,
  },
  {
    label: "Moderation",
    href: "/admin/moderation",
    icon: Shield,
    minRole: "moderator" as const,
  },
  {
    label: "Gallery projector",
    href: "/admin/gallery-display",
    icon: MonitorPlay,
    minRole: "moderator" as const,
  },
];

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (role === "admin") return true;
    return item.minRole !== "admin";
  });

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-black/50 md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-start justify-between gap-3 p-4 pb-2 md:flex-col md:pb-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
            <Shield className="h-5 w-5 shrink-0 text-cyan-400" />
            Admin
          </h2>
          <p className="mt-0.5 text-[11px] capitalize text-white/50 sm:text-xs">{role}</p>
        </div>
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/70 transition-colors hover:border-white/20 hover:text-white md:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          App
        </Link>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-col md:space-y-1 md:overflow-visible md:px-4 md:pb-0 [&::-webkit-scrollbar]:hidden">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors md:whitespace-normal",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/dashboard"
        className="mt-auto hidden items-center gap-2 px-4 py-3 text-sm text-white/40 transition-colors hover:text-white md:flex"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to App
      </Link>
    </aside>
  );
}
