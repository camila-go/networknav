"use client";

import { MessageCircle, Users, Calendar, Share2 } from "lucide-react";
import type { UserActivity, ActivityType } from "@/types";
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  activities: UserActivity[];
  maxItems?: number;
}

const ACTIVITY_CONFIG: Record<ActivityType, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}> = {
  message_sent: {
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    label: "Sent a message",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
  },
  meeting_scheduled: {
    icon: <Calendar className="h-3.5 w-3.5" />,
    label: "Scheduled a meeting",
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
  },
  connection_made: {
    icon: <Users className="h-3.5 w-3.5" />,
    label: "Made a connection",
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
  },
  intro_requested: {
    icon: <Share2 className="h-3.5 w-3.5" />,
    label: "Requested an intro",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
};

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-white/50">No recent activity</p>
        <p className="text-sm text-white/30 mt-1">
          Start messaging and connecting to earn points!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>

      <div className="space-y-3">
        {displayActivities.map((activity) => {
          const config = ACTIVITY_CONFIG[activity.activityType];
          const timeAgo = getTimeAgo(activity.createdAt);

          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 py-2"
            >
              {/* Icon */}
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                config.bgColor,
                config.color
              )}>
                {config.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80">{config.label}</p>
                <p className="text-xs text-white/40">{timeAgo}</p>
              </div>

              {/* Points */}
              <div className="shrink-0">
                <span className="text-sm font-medium text-cyan-400">
                  +{activity.pointsEarned}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activities.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <button className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
