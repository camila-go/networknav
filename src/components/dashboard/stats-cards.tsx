import { Users, MessageCircle, Clock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Mock data - replace with real data fetch
const stats = {
  activeConnections: 12,
  pendingRequests: 3,
  unreadMessages: 5,
  matchScore: 94,
};

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Connections"
        value={stats.activeConnections}
        iconColor="text-primary"
        iconBg="bg-primary/10"
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label="Pending"
        value={stats.pendingRequests}
        iconColor="text-coral-500"
        iconBg="bg-coral-50"
      />
      <StatCard
        icon={<MessageCircle className="h-5 w-5" />}
        label="Unread"
        value={stats.unreadMessages}
        iconColor="text-teal-500"
        iconBg="bg-teal-50"
      />
      <StatCard
        icon={<Sparkles className="h-5 w-5" />}
        label="Match Score"
        value={`${stats.matchScore}%`}
        iconColor="text-amber-500"
        iconBg="bg-amber-50"
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

