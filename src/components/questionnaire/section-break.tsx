import type { QuestionSection } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface SectionBreakProps {
  previousSection: QuestionSection;
  nextSection: QuestionSection;
  onContinue: () => void;
}

export function SectionBreak({
  previousSection,
  nextSection,
  onContinue,
}: SectionBreakProps) {
  return (
    <div className="text-center space-y-8 animate-fade-in">
      {/* Completed section celebration */}
      <div className="flex items-center justify-center gap-2 text-teal-600">
        <CheckCircle2 className="h-6 w-6" />
        <span className="font-medium">
          {previousSection.title} complete!
        </span>
      </div>

      {/* Progress encouragement */}
      <div className="space-y-2">
        <div className="text-4xl">{nextSection.icon}</div>
        <h2 className="text-2xl font-display font-bold text-navy-900">
          Up Next: {nextSection.title}
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {nextSection.subtitle}
        </p>
      </div>

      <Button onClick={onContinue} size="lg" className="gap-2">
        Continue
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

