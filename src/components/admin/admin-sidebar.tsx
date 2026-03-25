"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Shield, ArrowLeft } from "lucide-react";
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
];

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (role === "admin") return true;
    return item.minRole !== "admin";
  });

  return (
    <aside className="w-64 min-h-screen border-r border-white/10 bg-black/50 p-4 flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          Admin Panel
        </h2>
        <p className="text-xs text-white/50 mt-1 capitalize">{role}</p>
      </div>

      <nav className="flex-1 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-white transition-colors mt-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to App
      </Link>
    </aside>
  );
}
