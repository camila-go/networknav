"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Users, 
  MessageCircle, 
  Calendar, 
  Trophy, 
  Flame, 
  Target,
  Zap,
  ArrowRight,
  Check,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_STORAGE_KEY = "jynx_onboarding_completed";
const QUESTIONNAIRE_COMPLETED_KEY = "jynx_questionnaire_completed";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlights?: { icon: React.ReactNode; text: string }[];
  gradient: string;
}

const steps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to GS26!",
    description:
      "Your AI-powered networking companion (powered by JYNX) for meaningful connections at Global Summit 2026.",
    icon: <Sparkles className="h-12 w-12" />,
    highlights: [
      { icon: <Users className="h-5 w-5" />, text: "Discover like-minded professionals" },
      { icon: <Zap className="h-5 w-5" />, text: "AI-matched connections" },
      { icon: <MessageCircle className="h-5 w-5" />, text: "Start conversations easily" },
    ],
    gradient: "from-cyan-500 to-teal-500",
  },
  {
    id: "matches",
    title: "Smart Matching",
    description: "We analyze your profile, interests, and goals to find the most valuable connections for you.",
    icon: <Network className="h-12 w-12" />,
    highlights: [
      { icon: <Sparkles className="h-5 w-5 text-teal-400" />, text: "High-Affinity matches share your interests and background" },
      { icon: <Zap className="h-5 w-5 text-amber-400" />, text: "Strategic matches offer complementary skills and opportunities" },
      { icon: <Target className="h-5 w-5" />, text: "Each match includes conversation starters to break the ice" },
    ],
    gradient: "from-violet-500 to-purple-500",
  },
  {
    id: "streaks",
    title: "Stay Connected with Streaks",
    description: "Build networking habits that stick! Your daily streak tracks consecutive days of networking activity.",
    icon: <Flame className="h-12 w-12" />,
    highlights: [
      { icon: <MessageCircle className="h-5 w-5" />, text: "Send messages to earn points (+5 per message)" },
      { icon: <Calendar className="h-5 w-5" />, text: "Schedule meetings to grow your network" },
      { icon: <Flame className="h-5 w-5 text-orange-400" />, text: "Keep your streak alive by connecting daily" },
    ],
    gradient: "from-orange-500 to-red-500",
  },
  {
    id: "goals",
    title: "Weekly Goals",
    description: "Set personalized weekly connection goals to stay motivated. You choose your target — we'll help you reach it!",
    icon: <Target className="h-12 w-12" />,
    highlights: [
      { icon: <Zap className="h-5 w-5" />, text: "Earn Connection Points through activity" },
      { icon: <Target className="h-5 w-5" />, text: "Customize your weekly goal (default: 25 points)" },
      { icon: <Sparkles className="h-5 w-5 text-yellow-400" />, text: "Celebrate when you hit your target!" },
    ],
    gradient: "from-emerald-500 to-green-500",
  },
  {
    id: "badges",
    title: "Earn Badges",
    description: "Unlock achievements as you grow your network. Badges showcase your networking journey on your profile!",
    icon: <Trophy className="h-12 w-12" />,
    highlights: [
      { icon: <Trophy className="h-5 w-5 text-amber-400" />, text: "First Connection — Start your journey" },
      { icon: <Flame className="h-5 w-5 text-orange-400" />, text: "Streak Master — Maintain a 7-day streak" },
      { icon: <MessageCircle className="h-5 w-5 text-cyan-400" />, text: "Conversation Starter — Send 10 messages" },
      { icon: <Calendar className="h-5 w-5 text-purple-400" />, text: "Meeting Pro — Schedule 5 meetings" },
    ],
    gradient: "from-amber-500 to-yellow-500",
  },
];

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    const justCompletedQuestionnaire = searchParams.get("welcome") === "true";
    const hasCompletedQuestionnaire = localStorage.getItem(QUESTIONNAIRE_COMPLETED_KEY);
    
    // Show onboarding if:
    // 1. User hasn't seen onboarding before AND
    // 2. User just completed questionnaire (from URL param) OR has completed it before
    if (!hasCompletedOnboarding && (justCompletedQuestionnaire || hasCompletedQuestionnaire)) {
      // Mark questionnaire as completed for future visits
      if (justCompletedQuestionnaire) {
        localStorage.setItem(QUESTIONNAIRE_COMPLETED_KEY, "true");
      }
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }

  function handlePrevious() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleComplete() {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsOpen(false);
  }

  function handleSkip() {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsOpen(false);
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleSkip(); }}>
      <DialogContent className="sm:max-w-lg bg-black border border-white/10 p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className={cn(
          "relative p-8 pb-12 bg-gradient-to-br text-white",
          step.gradient
        )}>
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-white/20 backdrop-blur-sm">
              {step.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center">{step.title}</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <p className="text-white/80 text-center leading-relaxed">
            {step.description}
          </p>

          {/* Highlights */}
          {step.highlights && (
            <div className="space-y-3">
              {step.highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex-shrink-0 text-white/80">
                    {highlight.icon}
                  </div>
                  <span className="text-sm text-white/80">{highlight.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep
                    ? "w-6 bg-cyan-500"
                    : index < currentStep
                    ? "bg-cyan-500/50"
                    : "bg-white/20"
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1 border-white/20 text-white hover:bg-white/10"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={cn(
                "flex-1 text-black font-semibold",
                "bg-gradient-to-r",
                step.gradient
              )}
            >
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  localStorage.removeItem(QUESTIONNAIRE_COMPLETED_KEY);
}
