import { Suspense } from "react";
import { MatchesGrid } from "@/components/dashboard/matches-grid";
import { StatsCards } from "@/components/dashboard/stats-cards";

export const metadata = {
  title: "Dashboard | Jynx",
  description: "View your leadership matches and connections",
};

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-navy-900">
          Your Matches
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover leaders who share your challenges, interests, and goals
        </p>
      </div>

      {/* Stats overview */}
      <Suspense fallback={<div className="h-24 shimmer rounded-xl" />}>
        <StatsCards />
      </Suspense>

      {/* Matches grid */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 shimmer rounded-2xl" />
            ))}
          </div>
        }
      >
        <MatchesGrid />
      </Suspense>
    </div>
  );
}

