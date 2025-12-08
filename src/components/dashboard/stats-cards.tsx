"use client";

import { useEffect, useState } from "react";
import { Users, MessageCircle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  activeConnections: number;
  pendingRequests: number;
  unreadMessages: number;
  matchScore: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    activeConnections: 0,
    pendingRequests: 0,
    unreadMessages: 0,
    matchScore: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch connections
        const connectionsRes = await fetch("/api/connections");
        const connectionsData = await connectionsRes.json();
        
        if (connectionsData.success) {
          const connections = connectionsData.data || [];
          const active = connections.filter((c: { status: string }) => c.status === "accepted").length;
          const pending = connections.filter((c: { status: string }) => c.status === "pending").length;
          
          setStats(prev => ({
            ...prev,
            activeConnections: active,
            pendingRequests: pending,
          }));
        }

        // Fetch matches for match score
        const matchesRes = await fetch("/api/matches");
        const matchesData = await matchesRes.json();
        
        if (matchesData.success && matchesData.data?.length > 0) {
          const avgScore = Math.round(
            matchesData.data.reduce((sum: number, m: { matchScore: number }) => sum + (m.matchScore * 100), 0) / 
            matchesData.data.length
          );
          setStats(prev => ({
            ...prev,
            matchScore: avgScore,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Connections"
        value={stats.activeConnections}
        iconColor="text-teal-600"
        iconBg="bg-teal-100"
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Pending"
        value={stats.pendingRequests}
        iconColor="text-coral-600"
        iconBg="bg-coral-100"
      />
      <StatCard
        icon={<MessageCircle className="h-5 w-5" />}
        label="Unread"
        value={stats.unreadMessages}
        iconColor="text-teal-600"
        iconBg="bg-teal-100"
      />
      <StatCard
        icon={<Sparkles className="h-5 w-5" />}
        label="Match Score"
        value={stats.matchScore > 0 ? `${stats.matchScore}%` : "—"}
        iconColor="text-amber-600"
        iconBg="bg-amber-100"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconColor: string;
  iconBg: string;
}

function StatCard({ icon, label, value, iconColor, iconBg }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-navy-900">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

