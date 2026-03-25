"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuestionnaireStore } from "@/lib/questionnaire-store";
import { QUESTIONNAIRE_SECTIONS } from "@/lib/questionnaire-data";
import { getCannedReaction } from "@/lib/questionnaire-reactions";
import { QuestionCard } from "./question-card";
import { ChatMessage, TypingIndicator } from "./chat-message";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, SkipForward } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { Question, QuestionnaireData } from "@/types";

// Flatten all questions across sections into a single ordered list
function getAllQuestions(): { question: Question; sectionIndex: number; sectionTitle: string }[] {
  const all: { question: Question; sectionIndex: number; sectionTitle: string }[] = [];
  QUESTIONNAIRE_SECTIONS.forEach((section, sectionIndex) => {
    section.questions.forEach((question) => {
      all.push({ question, sectionIndex, sectionTitle: section.title });
    });
  });
  return all;
}

interface ChatEntry {
  id: string;
  role: "host" | "user";
  content: string;
  /** If this entry contains a question input, which question index */
  questionIndex?: number;
}

const WELCOME_MESSAGE = "Hey! I'm Jynx, your networking concierge for the summit. I'm going to ask you a few quick questions so I can find you the best people to connect with. Ready? Let's go!";

const SECTION_TRANSITIONS: Record<number, string> = {
  1: "Great start! Now let's talk about your goals and what you're looking for from this event.",
  2: "Almost there! A couple more about your style and what energizes you.",
};

const COMPLETION_MESSAGE = "That's a wrap! I've got a great picture of who you are and what you're looking for. Give me a moment to find your best matches...";

export function ConversationalWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const allQuestions = getAllQuestions();
  const totalQuestions = allQuestions.length;

  const {
    responses,
    isSubmitting,
    setResponse,
    setSubmitting,
    reset,
  } = useQuestionnaireStore();

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Track previous Q&A context for AI reactions
  const previousContextRef = useRef<{ question: string; answer: string }[]>([]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    // Small delay to let DOM update
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping, scrollToBottom]);

  // Initialize: show welcome message then first question
  useEffect(() => {
    if (hasStarted) return;
    setHasStarted(true);

    const initSequence = async () => {
      // Welcome message
      setIsTyping(true);
      await delay(600);
      setIsTyping(false);

      setChatHistory([
        { id: "welcome", role: "host", content: WELCOME_MESSAGE },
      ]);

      // First question
      await delay(400);
      setIsTyping(true);
      await delay(500);
      setIsTyping(false);

      const firstQ = allQuestions[0];
      const prompt = firstQ.question.conversationalPrompt || firstQ.question.text;
      setChatHistory((prev) => [
        ...prev,
        { id: `q-${0}`, role: "host", content: prompt, questionIndex: 0 },
      ]);
    };

    initSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentQuestionData = allQuestions[activeQuestionIndex];
  const currentQuestion = currentQuestionData?.question;

  // Format user's answer as readable text
  function formatAnswer(question: Question, value: QuestionnaireData[keyof QuestionnaireData]): string {
    if (!value) return "";

    if (Array.isArray(value)) {
      const labels = value.map((v) => {
        const option = question.options?.find((o) => o.value === v);
        return option?.label || v;
      });

      // Include custom interests if applicable
      if (question.customFieldId) {
        const customValues = responses[question.customFieldId] as string[] | undefined;
        if (customValues?.length) {
          labels.push(...customValues);
        }
      }

      return labels.join(", ");
    }

    const option = question.options?.find((o) => o.value === value);
    return option?.label || String(value);
  }

  // Check if current question can proceed (mirrors store logic)
  function canCurrentQuestionProceed(): boolean {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;

    const response = responses[currentQuestion.id];

    if (currentQuestion.type === "multi-select-custom") {
      const predefinedCount = Array.isArray(response) ? response.length : 0;
      const customFieldId = currentQuestion.customFieldId;
      const customValues = customFieldId ? responses[customFieldId] : [];
      const customCount = Array.isArray(customValues) ? customValues.length : 0;
      const totalCount = predefinedCount + customCount;
      return totalCount >= (currentQuestion.minSelections || 1);
    }

    if (currentQuestion.type === "multi-select" || currentQuestion.type === "rank") {
      if (!Array.isArray(response)) return false;
      return response.length >= (currentQuestion.minSelections || 1);
    }

    return response !== undefined && response !== "" && response !== null;
  }

  // Handle answer submission
  async function handleSubmitAnswer() {
    if (inputLocked || !currentQuestion) return;

    const value = responses[currentQuestion.id];
    if (!canCurrentQuestionProceed()) return;

    setInputLocked(true);

    // Add user's answer to chat
    const answerText = formatAnswer(currentQuestion, value);
    setChatHistory((prev) => [
      ...prev,
      { id: `a-${activeQuestionIndex}`, role: "user", content: answerText },
    ]);

    // Track context for AI
    previousContextRef.current.push({
      question: currentQuestion.conversationalPrompt || currentQuestion.text,
      answer: answerText,
    });

    const nextIndex = activeQuestionIndex + 1;
    const isLast = nextIndex >= totalQuestions;

    // Show typing indicator while fetching reaction
    await delay(300);
    setIsTyping(true);

    // Fetch reaction (AI with canned fallback)
    const reaction = await fetchReaction(
      currentQuestion.id,
      currentQuestion.conversationalPrompt || currentQuestion.text,
      answerText
    );

    await delay(400);
    setIsTyping(false);

    if (isLast) {
      // Final reaction + completion
      setChatHistory((prev) => [
        ...prev,
        { id: "final-reaction", role: "host", content: reaction },
      ]);

      await delay(500);
      setIsTyping(true);
      await delay(600);
      setIsTyping(false);

      setChatHistory((prev) => [
        ...prev,
        { id: "completion", role: "host", content: COMPLETION_MESSAGE },
      ]);

      setIsComplete(true);
      setInputLocked(false);
      return;
    }

    // Check if we're transitioning to a new section
    const currentSectionIdx = currentQuestionData.sectionIndex;
    const nextSectionIdx = allQuestions[nextIndex].sectionIndex;
    const isNewSection = nextSectionIdx !== currentSectionIdx;

    // Add reaction
    setChatHistory((prev) => [
      ...prev,
      { id: `r-${activeQuestionIndex}`, role: "host", content: reaction },
    ]);

    // Section transition message
    if (isNewSection && SECTION_TRANSITIONS[nextSectionIdx]) {
      await delay(400);
      setIsTyping(true);
      await delay(500);
      setIsTyping(false);

      setChatHistory((prev) => [
        ...prev,
        { id: `section-${nextSectionIdx}`, role: "host", content: SECTION_TRANSITIONS[nextSectionIdx] },
      ]);
    }

    // Next question
    await delay(300);
    setIsTyping(true);
    await delay(500);
    setIsTyping(false);

    const nextQ = allQuestions[nextIndex];
    const nextPrompt = nextQ.question.conversationalPrompt || nextQ.question.text;
    setChatHistory((prev) => [
      ...prev,
      { id: `q-${nextIndex}`, role: "host", content: nextPrompt, questionIndex: nextIndex },
    ]);

    setActiveQuestionIndex(nextIndex);
    setInputLocked(false);
  }

  // Fetch reaction from API (tries AI, falls back to canned)
  async function fetchReaction(
    questionId: string,
    questionText: string,
    answer: string
  ): Promise<string> {
    try {
      const res = await fetch("/api/questionnaire/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          questionText,
          answer,
          context: previousContextRef.current.slice(-3),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.reaction) {
          return data.data.reaction;
        }
      }
    } catch {
      // Fall through to canned
    }

    return getCannedReaction(questionId, answer);
  }

  // Handle final submission
  async function handleComplete() {
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

      reset();
      router.push("/dashboard?welcome=true");
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
    if (!currentQuestion || currentQuestion.required || inputLocked) return;

    // Treat skip like an empty answer submission
    setChatHistory((prev) => [
      ...prev,
      { id: `a-${activeQuestionIndex}`, role: "user", content: "Skipped" },
    ]);

    const nextIndex = activeQuestionIndex + 1;
    if (nextIndex >= totalQuestions) {
      setIsComplete(true);
      return;
    }

    setActiveQuestionIndex(nextIndex);
    const nextQ = allQuestions[nextIndex];
    const nextPrompt = nextQ.question.conversationalPrompt || nextQ.question.text;
    setChatHistory((prev) => [
      ...prev,
      { id: `q-${nextIndex}`, role: "host", content: nextPrompt, questionIndex: nextIndex },
    ]);
  }

  // Progress percentage
  const progressPercent = isComplete
    ? 100
    : Math.round(((activeQuestionIndex) / totalQuestions) * 100);

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto">
      {/* Thin progress bar */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-black">J</span>
            </div>
            <span className="text-sm font-medium text-white/80">Jynx</span>
          </div>
          <span className="text-xs text-white/50">
            {isComplete ? "Done!" : `${activeQuestionIndex + 1} of ${totalQuestions}`}
          </span>
        </div>
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Chat area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        {chatHistory.map((entry) => (
          <div key={entry.id}>
            <ChatMessage
              role={entry.role}
              content={entry.content}
            />

            {/* Render question input below the host question message */}
            {entry.role === "host" &&
              entry.questionIndex !== undefined &&
              entry.questionIndex === activeQuestionIndex &&
              !isComplete && (
                <div className="mt-4 ml-11">
                  <QuestionCard
                    question={allQuestions[entry.questionIndex].question}
                    value={responses[allQuestions[entry.questionIndex].question.id]}
                    customValue={
                      allQuestions[entry.questionIndex].question.customFieldId
                        ? (responses[allQuestions[entry.questionIndex].question.customFieldId!] as string[] | undefined)
                        : undefined
                    }
                    onChange={(value) =>
                      setResponse(allQuestions[entry.questionIndex!].question.id, value)
                    }
                    onCustomChange={
                      allQuestions[entry.questionIndex].question.customFieldId
                        ? (customValues) =>
                            setResponse(
                              allQuestions[entry.questionIndex!].question.customFieldId!,
                              customValues
                            )
                        : undefined
                    }
                  />

                  {/* Submit / Skip buttons */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={!canCurrentQuestionProceed() || inputLocked}
                      className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400"
                    >
                      {inputLocked ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Hold on...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    {!currentQuestion?.required && (
                      <Button
                        variant="ghost"
                        onClick={handleSkip}
                        disabled={inputLocked}
                        className="gap-2 text-white/50 hover:text-white/80"
                      >
                        Skip
                        <SkipForward className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
          </div>
        ))}

        {isTyping && <TypingIndicator />}

        {/* Completion CTA */}
        {isComplete && (
          <div className="flex justify-center mt-6 animate-slide-up">
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 px-8 py-3 text-base font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Finding your matches...
                </>
              ) : (
                <>
                  See My Matches
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
