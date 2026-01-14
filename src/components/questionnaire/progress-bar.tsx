import { cn } from "@/lib/utils";

interface ProgressBarProps {
  percentage: number;
  currentQuestion: number;
  totalQuestions: number;
  sectionProgress: string;
}

export function ProgressBar({
  percentage,
  currentQuestion,
  totalQuestions,
  sectionProgress,
}: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">{sectionProgress}</span>
        <span className="font-medium text-white/80">
          Question {currentQuestion} of {totalQuestions}
        </span>
      </div>

      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Milestone markers */}
      <div className="flex justify-between px-1">
        {[25, 50, 75, 100].map((milestone) => (
          <div
            key={milestone}
            className={cn(
              "text-xs transition-colors duration-300",
              percentage >= milestone
                ? "text-cyan-400 font-medium"
                : "text-white/40"
            )}
          >
            {percentage >= milestone && milestone !== 100 && "✓ "}
            {milestone}%
          </div>
        ))}
      </div>
    </div>
  );
}

