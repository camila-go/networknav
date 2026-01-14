"use client";

import { useRouter } from "next/navigation";
import { useQuestionnaireStore } from "@/lib/questionnaire-store";
import { QUESTIONNAIRE_SECTIONS } from "@/lib/questionnaire-data";
import { QuestionCard } from "./question-card";
import { ProgressBar } from "./progress-bar";
import { SectionBreak } from "./section-break";
import { CompletionScreen } from "./completion-screen";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, SkipForward } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export function QuestionnaireWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const {
    currentSectionIndex,
    currentQuestionIndex,
    responses,
    isSubmitting,
    setResponse,
    nextQuestion,
    prevQuestion,
    canProceed,
    getProgress,
    setSubmitting,
    reset,
  } = useQuestionnaireStore();

  const progress = getProgress();
  const currentSection = QUESTIONNAIRE_SECTIONS[currentSectionIndex];
  const currentQuestion = currentSection.questions[currentQuestionIndex];
  const isLastQuestion =
    currentSectionIndex === QUESTIONNAIRE_SECTIONS.length - 1 &&
    currentQuestionIndex === currentSection.questions.length - 1;
  const isFirstQuestion =
    currentSectionIndex === 0 && currentQuestionIndex === 0;

  // Check if we're at the start of a new section (not the first section)
  const showSectionBreak =
    currentQuestionIndex === 0 && currentSectionIndex > 0;
  const previousSection =
    currentSectionIndex > 0
      ? QUESTIONNAIRE_SECTIONS[currentSectionIndex - 1]
      : null;

  async function handleNext() {
    if (isLastQuestion) {
      await handleSubmit();
    } else {
      nextQuestion();
    }
  }

  async function handleSubmit() {
    setSubmitting(true);

    try {
      const response = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Failed to save responses",
          description: result.error || "Please try again",
        });
        setSubmitting(false);
        return;
      }

      toast({
        variant: "success",
        title: "Profile complete!",
        description: "We're finding your matches...",
      });

      // Clear the stored questionnaire state
      reset();

      // Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again later",
      });
      setSubmitting(false);
    }
  }

  function handleSkip() {
    nextQuestion();
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with progress */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <ProgressBar
            percentage={progress.percentage}
            currentQuestion={progress.currentQuestion}
            totalQuestions={progress.totalQuestions}
            sectionProgress={progress.sectionProgress}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Section header */}
          <div className="mb-8 text-center animate-fade-in">
            <span className="text-4xl mb-4 block" role="img" aria-label={currentSection.title}>
              {currentSection.icon}
            </span>
            <h2 className="text-sm font-semibold text-coral-400 uppercase tracking-wider mb-2">
              {currentSection.title}
            </h2>
            <p className="text-white/60 text-sm">
              {currentSection.subtitle}
            </p>
          </div>

          {/* Question card */}
          <div className="animate-slide-in-right" key={currentQuestion.id}>
            <QuestionCard
              question={currentQuestion}
              value={responses[currentQuestion.id]}
              customValue={currentQuestion.customFieldId ? (responses[currentQuestion.customFieldId] as string[] | undefined) : undefined}
              onChange={(value) => setResponse(currentQuestion.id, value)}
              onCustomChange={currentQuestion.customFieldId ? (customValues) => setResponse(currentQuestion.customFieldId!, customValues) : undefined}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="ghost"
              onClick={prevQuestion}
              disabled={isFirstQuestion || isSubmitting}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {!currentQuestion.required && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="gap-2 text-muted-foreground"
                >
                  Skip
                  <SkipForward className="h-4 w-4" />
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className={cn(
                  "gap-2",
                  isLastQuestion && "bg-gradient-to-r from-primary to-teal-500"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isLastQuestion ? (
                  <>
                    Complete
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

