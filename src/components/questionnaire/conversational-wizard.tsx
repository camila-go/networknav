"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useQuestionnaireStore } from "@/lib/questionnaire-store";
import {
  QUESTIONNAIRE_SECTIONS,
  SUMMIT_RESPONSE_HINT,
  detectRefinedInterestVariant,
  REFINED_INTEREST_AI,
  REFINED_INTEREST_LEADERSHIP,
  PERSONAL_INTEREST_PHOTO_QUESTION,
} from "@/lib/questionnaire-data";
import { PersonalInterestPhotoStep } from "./personal-interest-photo-step";
import { ConfirmProfileStep } from "./confirm-profile-step";
import { getCannedReaction } from "@/lib/questionnaire-reactions";
import { QuestionCard } from "./question-card";
import { ChatMessage, TypingIndicator } from "./chat-message";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { Question, QuestionnaireData } from "@/types";

type FlowRow = {
  question: Question;
  sectionIndex: number;
  sectionTitle: string;
};

function buildBaseFlow(): FlowRow[] {
  const all: FlowRow[] = [];
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
  questionIndex?: number;
}

const TRANSITION_MORE = "Just a few more questions";

const COMPLETION_MESSAGE =
  "That's it – you're all set 🙌\n\nWe'll use this to help you meet great people and surface shared interests during the event.\n\nKeep an eye out for your profile on screens during the summit 👀";

function buildWelcomeLines(profile: {
  firstName: string;
  title: string;
  company?: string;
}): string {
  const org = profile.company ? ` at ${profile.company}` : "";
  return `Hey ${profile.firstName} 👋 I'm your Networking Navigator.\n\nI'll ask eight quick questions to learn more about you and help connect you with other attendees who share your interests. It'll only take about three minutes.\n\nFirst, let's confirm your department and title.\n${profile.title}${org}`;
}

export function ConversationalWizard() {
  const router = useRouter();
  const { toast } = useToast();

  const [flowSteps, setFlowSteps] = useState<FlowRow[]>(buildBaseFlow);
  const flowStepsRef = useRef(flowSteps);
  useEffect(() => {
    flowStepsRef.current = flowSteps;
  }, [flowSteps]);

  const insertedRefinedRef = useRef(false);
  const insertedPersonalInterestPhotoRef = useRef(false);

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
  const [isConfirmingProfile, setIsConfirmingProfile] = useState(false);
  const [profileData, setProfileData] = useState<{
    name: string;
    title: string;
    company: string;
  } | null>(null);
  const cachedProfileRef = useRef<Record<string, unknown> | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [welcomeReady, setWelcomeReady] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const previousContextRef = useRef<{ question: string; answer: string }[]>(
    []
  );
  /** Prevents double advancement from the optional photo step (prefer this over inputLocked checks that can noop). */
  const photoStepAdvanceStartedRef = useRef(false);

  useEffect(() => {
    const q = flowStepsRef.current[activeQuestionIndex]?.question?.id;
    if (q !== "personalInterestPhoto") {
      photoStepAdvanceStartedRef.current = false;
    }
  }, [activeQuestionIndex]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping, scrollToBottom]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((r) => r.json())
      .then(() => {
        if (!cancelled) setWelcomeReady(true);
      })
      .catch(() => {
        if (!cancelled) setWelcomeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasStarted || !welcomeReady) return;
    setHasStarted(true);

    const initSequence = async () => {
      setIsTyping(true);
      await delay(500);
      setIsTyping(false);

      let welcome = buildWelcomeLines({
        firstName: "there",
        title: "your title",
      });

      try {
        const res = await fetch("/api/profile");
        const d = await res.json();
        if (d.success && d.data?.user?.profile?.name) {
          const p = d.data.user.profile;
          const first = String(p.name).trim().split(/\s+/)[0] || "there";
          welcome = buildWelcomeLines({
            firstName: first,
            title: (p.title || "Your title").trim(),
            company: p.company?.trim(),
          });
        }
      } catch {
        /* keep default welcome */
      }

      setChatHistory([{ id: "welcome", role: "host", content: welcome }]);

      await delay(350);
      setChatHistory((prev) => [
        ...prev,
        {
          id: "hint",
          role: "host",
          content: SUMMIT_RESPONSE_HINT,
        },
      ]);

      await delay(400);
      setIsTyping(true);
      await delay(450);
      setIsTyping(false);

      const firstQ = buildBaseFlow()[0];
      const prompt =
        firstQ.question.conversationalPrompt || firstQ.question.text;
      setChatHistory((prev) => [
        ...prev,
        { id: "q-0", role: "host", content: prompt, questionIndex: 0 },
      ]);
    };

    initSequence();
  }, [hasStarted, welcomeReady]);

  const currentQuestionData = flowSteps[activeQuestionIndex];
  const currentQuestion = currentQuestionData?.question;
  const totalQuestions = flowSteps.length;

  function formatAnswer(
    question: Question,
    value: QuestionnaireData[keyof QuestionnaireData]
  ): string {
    if (!value) return "";

    if (question.type === "text") {
      return String(value).trim();
    }

    if (Array.isArray(value)) {
      const labels = value.map((v) => {
        const option = question.options?.find((o) => o.value === v);
        return option?.label || v;
      });
      if (question.customFieldId) {
        const customValues = responses[question.customFieldId] as
          | string[]
          | undefined;
        if (customValues?.length) {
          labels.push(...customValues);
        }
      }
      return labels.join(", ");
    }

    const option = question.options?.find((o) => o.value === value);
    return option?.label || String(value);
  }

  function canCurrentQuestionProceed(): boolean {
    if (!currentQuestion) return false;
    if (currentQuestion.id === "personalInterestPhoto") return false;

    if (!currentQuestion.required) return true;

    const response = responses[currentQuestion.id];

    if (currentQuestion.type === "text") {
      return typeof response === "string" && response.trim().length > 0;
    }

    if (currentQuestion.type === "multi-select-custom") {
      const predefinedCount = Array.isArray(response) ? response.length : 0;
      const customFieldId = currentQuestion.customFieldId;
      const customValues = customFieldId ? responses[customFieldId] : [];
      const customCount = Array.isArray(customValues) ? customValues.length : 0;
      const totalCount = predefinedCount + customCount;
      return totalCount >= (currentQuestion.minSelections || 1);
    }

    if (
      currentQuestion.type === "multi-select" ||
      currentQuestion.type === "rank"
    ) {
      if (!Array.isArray(response)) return false;
      return response.length >= (currentQuestion.minSelections || 1);
    }

    return response !== undefined && response !== "" && response !== null;
  }

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
      /* canned */
    }

    return getCannedReaction(questionId, answer);
  }

  async function advanceAfterPersonalInterestPhoto() {
    const flow = flowStepsRef.current;
    const currentIdx = activeQuestionIndex;
    const row = flow[currentIdx];
    if (row?.question.id !== "personalInterestPhoto") return;

    const nextIndex = currentIdx + 1;
    const isLast = nextIndex >= flow.length;

    await delay(280);
    setIsTyping(true);
    await delay(350);
    setIsTyping(false);

    if (isLast) {
      await beginProfileConfirmation();
      return;
    }

    setChatHistory((prev) => [
      ...prev,
      {
        id: `r-photo-${currentIdx}`,
        role: "host",
        content:
          "Thanks — that helps people spot shared interests during the event.",
      },
    ]);

    const currentSectionIdx = row.sectionIndex;
    const nextSectionIdx = flow[nextIndex].sectionIndex;
    const isNewSection = nextSectionIdx !== currentSectionIdx;
    if (
      isNewSection &&
      flow[nextIndex].question.id !== "refinedInterest"
    ) {
      await delay(300);
      setIsTyping(true);
      await delay(400);
      setIsTyping(false);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `section-${nextSectionIdx}`,
          role: "host",
          content: `Next up: ${flow[nextIndex].sectionTitle.toLowerCase()}.`,
        },
      ]);
    }

    await delay(280);
    setIsTyping(true);
    await delay(450);
    setIsTyping(false);

    const nextQ = flow[nextIndex];
    const nextPrompt =
      nextQ.question.conversationalPrompt || nextQ.question.text;
    setChatHistory((prev) => [
      ...prev,
      {
        id: `q-${nextIndex}`,
        role: "host",
        content: nextPrompt,
        questionIndex: nextIndex,
      },
    ]);

    setActiveQuestionIndex(nextIndex);
    setInputLocked(false);
  }

  function handlePersonalInterestPhotoSkip() {
    if (photoStepAdvanceStartedRef.current) return;
    photoStepAdvanceStartedRef.current = true;
    setInputLocked(true);
    setResponse("personalInterestPhoto", "skipped");
    setChatHistory((prev) => [
      ...prev,
      {
        id: `a-${activeQuestionIndex}-photo`,
        role: "user",
        content: "Skipped photo",
      },
    ]);
    void advanceAfterPersonalInterestPhoto();
  }

  function handlePersonalInterestPhotoUploaded() {
    if (photoStepAdvanceStartedRef.current) return;
    photoStepAdvanceStartedRef.current = true;
    setInputLocked(true);
    setResponse("personalInterestPhoto", "uploaded");
    setChatHistory((prev) => [
      ...prev,
      {
        id: `a-${activeQuestionIndex}-photo`,
        role: "user",
        content: "Added an activity photo",
      },
    ]);
    void advanceAfterPersonalInterestPhoto();
  }

  function showCompletionMessage() {
    setChatHistory((prev) => [
      ...prev,
      { id: "completion", role: "host", content: COMPLETION_MESSAGE },
    ]);
    setIsComplete(true);
    setInputLocked(false);
  }

  async function beginProfileConfirmation(finalReaction?: string) {
    if (finalReaction) {
      setChatHistory((prev) => [
        ...prev,
        { id: "final-reaction", role: "host", content: finalReaction },
      ]);
    }

    try {
      const res = await fetch("/api/profile");
      const d = await res.json();
      if (d.success && d.data?.user?.profile) {
        const p = d.data.user.profile;
        cachedProfileRef.current = p;
        setProfileData({
          name: p.name || "",
          title: p.title || "",
          company: p.company || "",
        });

        await delay(450);
        setIsTyping(true);
        await delay(500);
        setIsTyping(false);

        setChatHistory((prev) => [
          ...prev,
          {
            id: "confirm-info",
            role: "host",
            content:
              "Before we wrap up, let's make sure your info looks right. You can edit any field below.",
          },
        ]);

        setIsConfirmingProfile(true);
        setInputLocked(false);
        return;
      }
    } catch {
      // Profile fetch failed — skip confirmation
    }

    // Fallback: no profile available (demo/anonymous), go straight to complete
    showCompletionMessage();
  }

  async function handleProfileConfirmed(updated: {
    name: string;
    title: string;
    company: string;
  }) {
    setInputLocked(true);

    const changed =
      updated.name !== profileData?.name ||
      updated.title !== profileData?.title ||
      updated.company !== profileData?.company;

    if (changed) {
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updated.name,
            title: updated.title,
            company: updated.company,
          }),
        });
      } catch {
        // Non-blocking — profile can be edited later from settings
      }

      setChatHistory((prev) => [
        ...prev,
        { id: "confirm-response", role: "user", content: "Updated my info" },
      ]);
    } else {
      setChatHistory((prev) => [
        ...prev,
        { id: "confirm-response", role: "user", content: "Looks good!" },
      ]);
    }

    setIsConfirmingProfile(false);

    await delay(300);
    setIsTyping(true);
    await delay(400);
    setIsTyping(false);

    showCompletionMessage();
  }

  async function handleSubmitAnswer() {
    if (inputLocked || !currentQuestion) return;

    const value = responses[currentQuestion.id];
    if (!canCurrentQuestionProceed()) return;

    setInputLocked(true);

    let flow = flowStepsRef.current;

    if (
      currentQuestion.id === "personalInterest" &&
      !insertedPersonalInterestPhotoRef.current
    ) {
      insertedPersonalInterestPhotoRef.current = true;
      const row = flow[activeQuestionIndex];
      flow = [
        ...flow.slice(0, activeQuestionIndex + 1),
        {
          question: PERSONAL_INTEREST_PHOTO_QUESTION,
          sectionIndex: row.sectionIndex,
          sectionTitle: row.sectionTitle,
        },
        ...flow.slice(activeQuestionIndex + 1),
      ];
      flowStepsRef.current = flow;
      setFlowSteps(flow);
    }

    if (
      currentQuestion.id === "talkTopic" &&
      !insertedRefinedRef.current
    ) {
      const variant = detectRefinedInterestVariant(
        responses.talkTopic as string | undefined
      );
      if (variant) {
        insertedRefinedRef.current = true;
        const row = flow[activeQuestionIndex];
        const refQ =
          variant === "ai" ? REFINED_INTEREST_AI : REFINED_INTEREST_LEADERSHIP;
        const insertRow: FlowRow = {
          question: refQ,
          sectionIndex: row.sectionIndex,
          sectionTitle: row.sectionTitle,
        };
        flow = [
          ...flow.slice(0, activeQuestionIndex + 1),
          insertRow,
          ...flow.slice(activeQuestionIndex + 1),
        ];
        flowStepsRef.current = flow;
        setFlowSteps(flow);
      }
    }

    const answerText = formatAnswer(currentQuestion, value);
    setChatHistory((prev) => [
      ...prev,
      { id: `a-${activeQuestionIndex}`, role: "user", content: answerText },
    ]);

    previousContextRef.current.push({
      question:
        currentQuestion.conversationalPrompt || currentQuestion.text,
      answer: answerText,
    });

    const nextIndex = activeQuestionIndex + 1;
    const isLast = nextIndex >= flow.length;

    await delay(280);
    setIsTyping(true);

    const reaction = await fetchReaction(
      currentQuestion.id,
      currentQuestion.conversationalPrompt || currentQuestion.text,
      answerText
    );

    await delay(350);
    setIsTyping(false);

    if (isLast) {
      await beginProfileConfirmation(reaction);
      return;
    }

    setChatHistory((prev) => [
      ...prev,
      { id: `r-${activeQuestionIndex}`, role: "host", content: reaction },
    ]);

    if (currentQuestion.id === "joyTrigger") {
      await delay(350);
      setIsTyping(true);
      await delay(400);
      setIsTyping(false);
      setChatHistory((prev) => [
        ...prev,
        { id: "transition-more", role: "host", content: TRANSITION_MORE },
      ]);
    }

    const currentSectionIdx = currentQuestionData.sectionIndex;
    const nextSectionIdx = flow[nextIndex].sectionIndex;
    const isNewSection = nextSectionIdx !== currentSectionIdx;
    if (
      isNewSection &&
      currentQuestion.id !== "joyTrigger" &&
      flow[nextIndex].question.id !== "refinedInterest"
    ) {
      await delay(300);
      setIsTyping(true);
      await delay(400);
      setIsTyping(false);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `section-${nextSectionIdx}`,
          role: "host",
          content: `Next up: ${flow[nextIndex].sectionTitle.toLowerCase()}.`,
        },
      ]);
    }

    await delay(280);
    setIsTyping(true);
    await delay(450);
    setIsTyping(false);

    const nextQ = flow[nextIndex];
    const nextPrompt =
      nextQ.question.conversationalPrompt || nextQ.question.text;
    setChatHistory((prev) => [
      ...prev,
      {
        id: `q-${nextIndex}`,
        role: "host",
        content: nextPrompt,
        questionIndex: nextIndex,
      },
    ]);

    setActiveQuestionIndex(nextIndex);
    setInputLocked(false);
  }

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
        title: "Profile complete",
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

  function handleSkipOptional() {
    if (!currentQuestion || currentQuestion.required || inputLocked) return;

    setChatHistory((prev) => [
      ...prev,
      { id: `a-${activeQuestionIndex}`, role: "user", content: "Skipped" },
    ]);

    void handleSubmitAfterSkip();
  }

  async function handleSubmitAfterSkip() {
    if (!currentQuestion) return;
    setInputLocked(true);

    const flow = flowStepsRef.current;
    const nextIndex = activeQuestionIndex + 1;
    const isLast = nextIndex >= flow.length;

    await delay(200);
    setIsTyping(true);
    await delay(300);
    setIsTyping(false);

    if (isLast) {
      await beginProfileConfirmation();
      return;
    }

    if (currentQuestion.id === "joyTrigger") {
      setChatHistory((prev) => [
        ...prev,
        { id: "transition-more", role: "host", content: TRANSITION_MORE },
      ]);
    }

    const nextQ = flow[nextIndex];
    const nextPrompt =
      nextQ.question.conversationalPrompt || nextQ.question.text;
    setChatHistory((prev) => [
      ...prev,
      {
        id: `q-${nextIndex}`,
        role: "host",
        content: nextPrompt,
        questionIndex: nextIndex,
      },
    ]);

    setActiveQuestionIndex(nextIndex);
    setInputLocked(false);
  }

  function handleCloseCard() {
    if (
      typeof window !== "undefined" &&
      window.confirm("Leave onboarding? Your progress is saved in this browser until you submit.")
    ) {
      router.push("/dashboard");
    }
  }

  const progressPercent = isComplete
    ? 100
    : isConfirmingProfile
      ? 95
      : Math.round((activeQuestionIndex / Math.max(totalQuestions, 1)) * 100);

  return (
    <div className="min-h-screen flex flex-col max-w-2xl mx-auto bg-zinc-950">
      <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">J</span>
            </div>
            <span className="text-sm font-medium text-zinc-300">Jynx</span>
          </div>
          <span className="text-xs text-zinc-500">
            {isComplete
              ? "Done!"
              : isConfirmingProfile
                ? "Almost done!"
                : `${activeQuestionIndex + 1} / ${totalQuestions}`}
          </span>
        </div>
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {chatHistory.map((entry) => (
          <div key={entry.id}>
            <ChatMessage role={entry.role} content={entry.content} />

            {entry.role === "host" &&
              entry.questionIndex !== undefined &&
              entry.questionIndex === activeQuestionIndex &&
                           !isComplete && (
                <div className="mt-3 ml-2 space-y-3 sm:ml-11 sm:mt-4 sm:space-y-4">
                  {entry.questionIndex === 0 ? (
                    <p className="pl-1 text-xs text-zinc-500">
                      Your answers help us personalize who we surface for you
                    </p>
                  ) : null}
                  {flowSteps[entry.questionIndex].question.id ===
                  "personalInterestPhoto" ? (
                    <PersonalInterestPhotoStep
                      key="personal-interest-photo-step"
                      personalInterestText={String(
                        responses.personalInterest ?? ""
                      )}
                      disabled={inputLocked}
                      onSkip={handlePersonalInterestPhotoSkip}
                      onUploaded={handlePersonalInterestPhotoUploaded}
                    />
                  ) : (
                    <>
                      <QuestionCard
                        question={flowSteps[entry.questionIndex].question}
                        value={
                          responses[flowSteps[entry.questionIndex].question.id]
                        }
                        customValue={
                          flowSteps[entry.questionIndex].question
                            .customFieldId
                            ? (responses[
                                flowSteps[entry.questionIndex].question
                                  .customFieldId!
                              ] as string[] | undefined)
                            : undefined
                        }
                        onChange={(v) =>
                          setResponse(
                            flowSteps[entry.questionIndex!].question.id,
                            v
                          )
                        }
                        onCustomChange={
                          flowSteps[entry.questionIndex].question.customFieldId
                            ? (customValues) =>
                                setResponse(
                                  flowSteps[entry.questionIndex!].question
                                    .customFieldId!,
                                  customValues
                                )
                            : undefined
                        }
                        presentation="summit"
                        summitMeta={{
                          current: activeQuestionIndex + 1,
                          total: totalQuestions,
                          onClose: handleCloseCard,
                        }}
                        summitFooter={
                          !flowSteps[entry.questionIndex].question
                            .required ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSkipOptional}
                              disabled={inputLocked}
                              className="rounded-lg border-zinc-600 bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            >
                              Skip
                            </Button>
                          ) : undefined
                        }
                      />

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => void handleSubmitAnswer()}
                          disabled={
                            !canCurrentQuestionProceed() || inputLocked
                          }
                          className="gap-2 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-white"
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
                      </div>
                    </>
                  )}
                </div>
              )}
          </div>
        ))}

        {isTyping && <TypingIndicator />}

        {isConfirmingProfile && profileData && (
          <div className="mt-4 ml-2 sm:ml-11 space-y-4 animate-slide-up">
            <ConfirmProfileStep
              profileData={profileData}
              onConfirm={(updated) => void handleProfileConfirmed(updated)}
              disabled={inputLocked}
            />
          </div>
        )}

        {isComplete && (
          <div className="flex justify-center mt-6 animate-slide-up">
            <Button
              onClick={() => void handleComplete()}
              disabled={isSubmitting}
              className="gap-2 px-8 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white"
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
