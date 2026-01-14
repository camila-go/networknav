"use client";

import { useEffect, useState } from "react";
import { Users, MessageCircle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Stats {
  activeConnections: number;
  pendingRequests: number;
  unreadMessages: number;
  matchScore: number;
  totalMatches: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats>({
    activeConnections: 0,
    pendingRequests: 0,
    unreadMessages: 0,
    matchScore: 0,
    totalMatches: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch connections
        const connectionsRes = await fetch("/api/connections", {
          credentials: "include",
        });
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
        const matchesRes = await fetch("/api/matches", {
          credentials: "include",
        });
        const matchesData = await matchesRes.json();
        
        if (matchesData.success) {
          const matches = matchesData.data?.matches || [];
          const totalMatches = matches.length;
          
          // Calculate average score - scores are 0-1 range, convert to percentage
          let avgScore = 0;
          if (totalMatches > 0) {
            const totalScore = matches.reduce((sum: number, m: { score?: number }) => {
              const score = typeof m.score === 'number' ? m.score : 0;
              return sum + score;
            }, 0);
            avgScore = Math.round((totalScore / totalMatches) * 100);
          }
          
          setStats(prev => ({
            ...prev,
            matchScore: avgScore,
            totalMatches,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    }

    // Fetch stats immediately and also after a short delay to ensure data is ready
    fetchStats();
    const timeoutId = setTimeout(fetchStats, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Connections"
        value={stats.activeConnections}
        iconColor="text-cyan-400"
        iconBg="bg-cyan-500/20"
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Pending"
        value={stats.pendingRequests}
        iconColor="text-amber-400"
        iconBg="bg-amber-500/20"
      />
      <StatCard
        icon={<MessageCircle className="h-5 w-5" />}
        label="Unread"
        value={stats.unreadMessages}
        iconColor="text-teal-400"
        iconBg="bg-teal-500/20"
      />
      <StatCard
        icon={<Sparkles className="h-5 w-5" />}
        label="Matches"
        value={stats.totalMatches}
        subtext={stats.matchScore > 0 ? `Avg ${stats.matchScore}%` : undefined}
        iconColor="text-emerald-400"
        iconBg="bg-emerald-500/20"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  iconColor: string;
  iconBg: string;
}

function StatCard({ icon, label, value, subtext, iconColor, iconBg }: StatCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>{icon}</div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtext && (
            <span className="text-xs text-white/60">{subtext}</span>
          )}
        </div>
        <p className="text-sm text-white/60">{label}</p>
      </div>
    </div>
  );
}

