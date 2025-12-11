import { Suspense } from "react";
import { MeetingsContainer } from "@/components/meetings/meetings-container";

export const metadata = {
  title: "My Meetings | Jynx",
  description: "View and manage your scheduled meetings",
};

export default function MeetingsPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <MeetingsContainer />
      </Suspense>
    </div>
  );
}

