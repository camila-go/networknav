import type { Question, QuestionSection } from "@/types";

/** Injected after `personalInterest` in conversational wizard only (optional photo + chip). */
export const PERSONAL_INTEREST_PHOTO_QUESTION: Question = {
  id: "personalInterestPhoto",
  text: "Optional: activity photo",
  conversationalPrompt:
    "If you’d like, add a photo of you doing that—and a short label (like “gardening”). It shows on your profile and our community gallery. Optional; you can skip.",
  type: "text",
  required: false,
  textPlaceholder: "",
  textMultiline: false,
};

export const SUMMIT_RESPONSE_HINT =
  "Keep answers short—1 sentence or quick taps work great.";

/** Conditional Q6A — same capture key as leadership branch */
export const REFINED_INTEREST_AI: Question = {
  id: "refinedInterest",
  text: "Nice—AI is everywhere right now. Are you more interested in using it, leading it, or figuring it out?",
  conversationalPrompt:
    "Nice—AI is everywhere right now. Are you more interested in using it, leading it, or figuring it out?",
  type: "text",
  required: false,
  textPlaceholder: "One sentence is plenty",
  textMultiline: false,
};

export const REFINED_INTEREST_LEADERSHIP: Question = {
  id: "refinedInterest",
  text: "Love that. Are you more focused on leading teams, influencing strategy, or developing yourself?",
  conversationalPrompt:
    "Love that. Are you more focused on leading teams, influencing strategy, or developing yourself?",
  type: "text",
  required: false,
  textPlaceholder: "One sentence is plenty",
  textMultiline: false,
};

export function detectRefinedInterestVariant(
  talkTopic: string | undefined
): "ai" | "leadership" | null {
  if (!talkTopic?.trim()) return null;
  const t = talkTopic.toLowerCase();
  if (
    /\bai\b/.test(t) ||
    /\bml\b/.test(t) ||
    t.includes("artificial intelligence") ||
    t.includes("machine learning") ||
    t.includes("genai") ||
    t.includes("llm")
  ) {
    return "ai";
  }
  if (/\bleadership\b/.test(t) || t.includes("leading teams")) {
    return "leadership";
  }
  return null;
}

export const QUESTIONNAIRE_SECTIONS: QuestionSection[] = [
  {
    id: "getting-to-know-you",
    title: "Getting to know you",
    subtitle: "About 3 minutes",
    icon: "👋",
    questions: [
      {
        id: "roleSummary",
        text: "In one sentence—what do you actually do (not your title)?",
        conversationalPrompt:
          "In one sentence—what do you actually do (not your title)?",
        type: "text",
        required: true,
        textPlaceholder: "e.g. I help teams ship AI products customers trust",
        textMultiline: true,
      },
      {
        id: "archetype",
        text: "Which of these best describes you? (don't overthink it)",
        conversationalPrompt:
          "Which of these best describes you? (don't overthink it)",
        type: "single-select",
        required: true,
        options: [
          { value: "builder", label: "Builder" },
          { value: "strategist", label: "Strategist" },
          { value: "creative", label: "Creative" },
          { value: "analyst", label: "Analyst" },
          { value: "operator", label: "Operator" },
          { value: "connector", label: "Connector" },
        ],
      },
      {
        id: "teamQualities",
        text: "When you're on a team, what qualities do you bring to the group?",
        conversationalPrompt:
          "When you're on a team, what qualities do you bring to the group?",
        type: "multi-select",
        required: true,
        minSelections: 1,
        maxSelections: 3,
        options: [
          { value: "perspective", label: "Perspective" },
          { value: "problem-solving", label: "Problem-solving" },
          { value: "collaboration", label: "Collaboration" },
          { value: "energy", label: "Energy" },
          { value: "ideas", label: "Ideas" },
        ],
      },
      {
        id: "growthArea",
        text: "What's something you've been wanting to learn or get better at?",
        conversationalPrompt:
          "What's something you've been wanting to learn or get better at?",
        type: "text",
        required: true,
        textPlaceholder: "Could be a skill, a topic, a habit…",
        textMultiline: true,
      },
      {
        id: "talkTopic",
        text: "What's a topic you could talk about for 10 minutes with no prep?",
        conversationalPrompt:
          "What's a topic you could talk about for 10 minutes with no prep?",
        type: "text",
        required: true,
        textPlaceholder: "Anything you're genuinely into",
        textMultiline: true,
      },
    ],
  },
  {
    id: "life-outside-work",
    title: "Life & style",
    subtitle: "The good stuff",
    icon: "✨",
    questions: [
      {
        id: "personalInterest",
        text: "Outside of work—what do you genuinely enjoy?",
        conversationalPrompt: "Outside of work—what do you genuinely enjoy?",
        type: "text",
        required: true,
        textPlaceholder: "Hobbies, people, places…",
        textMultiline: true,
      },
      {
        id: "personalityTags",
        text: "Pick a few that fit you:",
        conversationalPrompt: "Pick a few that fit you:",
        type: "multi-select",
        required: true,
        minSelections: 2,
        maxSelections: 6,
        options: [
          { value: "early-bird", label: "Early bird" },
          { value: "night-owl", label: "Night owl" },
          { value: "planner", label: "Planner" },
          { value: "go-with-the-flow", label: "Go-with-the-flow" },
          { value: "social", label: "Social" },
          { value: "recharge-solo", label: "Recharge solo" },
        ],
      },
      {
        id: "joyTrigger",
        text: "What's a small thing that makes your day better?",
        conversationalPrompt: "What's a small thing that makes your day better?",
        type: "text",
        required: true,
        textPlaceholder: "Coffee, a walk, a playlist…",
        textMultiline: false,
      },
    ],
  },
  {
    id: "summit-profile",
    title: "Your Summit profile",
    subtitle: "Almost done",
    icon: "🎤",
    questions: [
      {
        id: "threeWords",
        text: "Describe yourself in 3 words",
        conversationalPrompt: "Describe yourself in 3 words",
        type: "text",
        required: true,
        textPlaceholder: "Three words, any order",
        textMultiline: false,
      },
      {
        id: "funFact",
        text: "Fun fact—something people wouldn't guess about you?",
        conversationalPrompt:
          "Fun fact—something people wouldn't guess about you?",
        type: "text",
        required: true,
        textPlaceholder: "The weirder, the better",
        textMultiline: true,
      },
    ],
  },
];

export function getTotalQuestions(): number {
  return QUESTIONNAIRE_SECTIONS.reduce(
    (total, section) => total + section.questions.length,
    0
  );
}

export function getRequiredQuestions(): number {
  return QUESTIONNAIRE_SECTIONS.reduce(
    (total, section) =>
      total + section.questions.filter((q) => q.required).length,
    0
  );
}

export function getSectionProgress(
  sectionIndex: number,
  totalSections: number = QUESTIONNAIRE_SECTIONS.length
): number {
  return Math.round(((sectionIndex + 1) / totalSections) * 100);
}

export function getSectionById(id: string): QuestionSection | undefined {
  return QUESTIONNAIRE_SECTIONS.find((section) => section.id === id);
}

export function getQuestionById(
  questionId: string
): { section: QuestionSection; question: (typeof QUESTIONNAIRE_SECTIONS)[0]["questions"][0] } | undefined {
  for (const section of QUESTIONNAIRE_SECTIONS) {
    const question = section.questions.find((q) => q.id === questionId);
    if (question) {
      return { section, question };
    }
  }
  return undefined;
}
