import { CheckCircle2, Users, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CompletionScreenProps {
  matchPotential?: {
    patterns: number;
    peerConnections: number;
    strategicOpportunities: number;
  };
}

export function CompletionScreen({
  matchPotential = {
    patterns: 187,
    peerConnections: 94,
    strategicOpportunities: 142,
  },
}: CompletionScreenProps) {
  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
      <div className="max-w-lg text-center space-y-8 animate-fade-in">
        {/* Success icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-teal-500/20 rounded-full animate-ping" />
          <div className="relative w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-navy-900 mb-4">
            🎉 Excellent! You're ready to connect!
          </h1>
          <p className="text-muted-foreground">
            We're matching you with fellow conference attendees now.
          </p>
        </div>

        {/* Match potential stats */}
        <div className="bg-white/60 glass rounded-2xl p-6 border border-navy-100">
          <h2 className="font-semibold text-navy-800 mb-4">
            Your Conference Match Potential
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Sparkles className="h-5 w-5 text-primary" />}
              value={matchPotential.patterns}
              label="Leadership patterns"
            />
            <StatCard
              icon={<Users className="h-5 w-5 text-teal-500" />}
              value={matchPotential.peerConnections}
              label="Peer connections"
            />
            <StatCard
              icon={<Zap className="h-5 w-5 text-coral-500" />}
              value={matchPotential.strategicOpportunities}
              label="Strategic matches"
            />
          </div>
        </div>

        {/* Timeline */}
        <p className="text-sm text-muted-foreground">
          Your first 6 personalized matches will appear within 24 hours —
          perfect timing to start planning meaningful conversations before the
          conference!
        </p>

        {/* Pro tip */}
        <div className="bg-primary/5 rounded-xl p-4 text-left">
          <p className="text-sm">
            <span className="font-medium text-primary">Pro tip:</span> Update
            your profile photo and company info to make a great first impression
            when connecting.
          </p>
        </div>

        {/* CTA */}
        <Link href="/dashboard">
          <Button size="lg" className="gap-2">
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="text-center space-y-1">
      <div className="flex justify-center">{icon}</div>
      <div className="text-2xl font-bold text-navy-900">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

