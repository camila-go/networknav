"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Clock, Sparkles, TrendingUp } from "lucide-react";

interface Stats {
  activeConnections: number;
  pendingMeetings: number;
  unreadMessages: number;
  matchScore: number;
  totalMatches: number;
}

interface StatsCardsProps {
  matchCount?: number;
  matchScore?: number;
}

export function StatsCards({ matchCount, matchScore }: StatsCardsProps = {}) {
  const [stats, setStats] = useState<Stats>({
    activeConnections: 0,
    pendingMeetings: 0,
    unreadMessages: 0,
    matchScore: matchScore || 0,
    totalMatches: matchCount || 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Update stats when props change
  useEffect(() => {
    if (matchCount !== undefined) {
      setStats(prev => ({ ...prev, totalMatches: matchCount }));
    }
    if (matchScore !== undefined) {
      setStats(prev => ({ ...prev, matchScore }));
    }
  }, [matchCount, matchScore]);

  const fetchOtherStats = useCallback(async () => {
    try {
      // Fetch connections and meetings (matches handled by props now)
      const [connectionsRes, meetingsRes] = await Promise.all([
        fetch("/api/connections").then(r => r.json()).catch(() => ({ success: false })),
        fetch("/api/meetings").then(r => r.json()).catch(() => ({ success: false })),
      ]);

      // Process connections
      let activeConnections = 0;
      if (connectionsRes?.success && Array.isArray(connectionsRes?.data)) {
        activeConnections = connectionsRes.data.filter((c: { status: string }) => c.status === "accepted").length;
      }

      // Process meetings
      let pendingMeetings = 0;
      if (meetingsRes?.success && meetingsRes?.data?.stats) {
        pendingMeetings = meetingsRes.data.stats.pending || 0;
      }

      setStats(prev => ({
        ...prev,
        activeConnections,
        pendingMeetings,
        unreadMessages: 0,
      }));
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOtherStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchOtherStats, 30000);
    
    return () => clearInterval(interval);
  }, [fetchOtherStats]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Connections"
        value={isLoading ? "—" : stats.activeConnections}
        iconColor="text-cyan-400"
        iconBg="bg-cyan-500/20"
        isLoading={isLoading}
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Pending Meetings"
        value={isLoading ? "—" : stats.pendingMeetings}
        iconColor="text-amber-400"
        iconBg="bg-amber-500/20"
        isLoading={isLoading}
      />
      <StatCard
        icon={<TrendingUp className="h-5 w-5" />}
        label="Avg Match"
        value={isLoading ? "—" : `${stats.matchScore}%`}
        iconColor="text-teal-400"
        iconBg="bg-teal-500/20"
        isLoading={isLoading}
      />
      <StatCard
        icon={<Sparkles className="h-5 w-5" />}
        label="Total Matches"
        value={isLoading ? "—" : stats.totalMatches}
        highlight={stats.totalMatches > 0}
        iconColor="text-fuchsia-400"
        iconBg="bg-fuchsia-500/20"
        isLoading={isLoading}
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
  highlight?: boolean;
  isLoading?: boolean;
}

function StatCard({ icon, label, value, subtext, iconColor, iconBg, highlight, isLoading }: StatCardProps) {
  return (
    <div className={`
      bg-white/5 border rounded-xl p-4 flex items-center gap-4 transition-all duration-300
      ${highlight ? 'border-fuchsia-500/50 shadow-lg shadow-fuchsia-500/10' : 'border-white/10'}
      ${isLoading ? 'animate-pulse' : ''}
    `}>
      <div className={`p-3 rounded-xl ${iconBg} ${iconColor} ${highlight ? 'animate-pulse-soft' : ''}`}>
        {icon}
      </div>
      <div>
        <div className="flex items-baseline gap-2">
          <p className={`text-2xl font-bold ${highlight ? 'text-fuchsia-400' : 'text-white'}`}>
            {value}
          </p>
          {subtext && (
            <span className="text-xs text-white/60">{subtext}</span>
          )}
        </div>
        <p className="text-sm text-white/60">{label}</p>
      </div>
    </div>
  );
}

