"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Shield, AlertTriangle, Activity, MonitorPlay } from "lucide-react";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  pendingModeration: number;
  reportsThisWeek: number;
  activeUsers: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setStats(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      label: "Pending Moderation",
      value: stats?.pendingModeration ?? 0,
      icon: Shield,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      href: "/admin/moderation",
    },
    {
      label: "Reports This Week",
      value: stats?.reportsThisWeek ?? 0,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Active Users",
      value: stats?.activeUsers ?? 0,
      icon: Activity,
      color: "text-green-400",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const content = (
            <Card
              key={card.label}
              className="bg-white/5 border-white/10 p-5 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/50">{card.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {loading ? "..." : card.value}
                  </p>
                </div>
                <div className={`${card.bg} p-3 rounded-lg`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </Card>
          );
          return card.href ? (
            <Link key={card.label} href={card.href}>
              {content}
            </Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      <Card className="mb-8 bg-white/5 border-white/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/15 p-3">
              <MonitorPlay className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="font-medium text-white">Gallery projector</p>
              <p className="text-sm text-white/50">
                16:9 wall of top community themes — active cohort or full network, for sessions
                and displays.
              </p>
            </div>
          </div>
          <Link
            href="/admin/gallery-display"
            className="shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20"
          >
            Open projector view
          </Link>
        </div>
      </Card>

      {stats && stats.pendingModeration > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/20 p-5">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-amber-400" />
            <div>
              <p className="font-medium text-white">
                {stats.pendingModeration} item{stats.pendingModeration !== 1 ? "s" : ""} awaiting review
              </p>
              <Link
                href="/admin/moderation"
                className="text-sm text-cyan-400 hover:underline"
              >
                Go to moderation queue
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
