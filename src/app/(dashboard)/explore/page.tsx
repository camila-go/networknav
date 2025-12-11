import { Suspense } from "react";
import { ExploreContainer } from "@/components/explore/explore-container";

export const metadata = {
  title: "Explore Attendees | Jynx",
  description: "Search and discover conference attendees to connect with",
};

export default function ExplorePage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <ExploreContainer />
      </Suspense>
    </div>
  );
}

