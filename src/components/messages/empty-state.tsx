import { MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  compact?: boolean;
}

export function EmptyState({ compact }: EmptyStateProps) {
  if (compact) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-black">
        <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-3">
          <MessageCircle className="h-6 w-6 text-cyan-400" />
        </div>
        <h3 className="font-medium text-white mb-1">No conversations yet</h3>
        <p className="text-sm text-white/60 mb-4">
          Connect with matches to start messaging
        </p>
        <Link href="/dashboard">
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
            View Matches
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-black">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/10 to-teal-500/10 flex items-center justify-center mb-6">
        <Users className="h-10 w-10 text-cyan-400" />
      </div>
      <h2 className="text-2xl font-display font-bold text-white mb-2">
        No conversations yet
      </h2>
      <p className="text-white/60 max-w-sm mb-6">
        Once you connect with other leaders, you can start meaningful
        conversations here.
      </p>
      <Link href="/dashboard">
        <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400">
          <MessageCircle className="h-4 w-4 mr-2" />
          View Your Matches
        </Button>
      </Link>
    </div>
  );
}

