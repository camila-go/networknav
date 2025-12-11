import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QuestionnaireData } from "@/types";
import { QUESTIONNAIRE_SECTIONS } from "./questionnaire-data";

interface QuestionnaireState {
  // Current state
  currentSectionIndex: number;
  currentQuestionIndex: number;
  responses: Partial<QuestionnaireData>;
  isSubmitting: boolean;

  // Actions
  setResponse: <K extends keyof QuestionnaireData>(
    key: K,
    value: QuestionnaireData[K]
  ) => void;
  nextQuestion: () => boolean; // Returns true if moved to next question
  prevQuestion: () => boolean; // Returns true if moved to previous question
  goToSection: (sectionIndex: number) => void;
  getProgress: () => {
    currentQuestion: number;
    totalQuestions: number;
    percentage: number;
    sectionProgress: string;
  };
  canProceed: () => boolean;
  reset: () => void;
  setSubmitting: (isSubmitting: boolean) => void;
}

function calculateCurrentQuestionNumber(
  sectionIndex: number,
  questionIndex: number
): number {
  let count = 0;
  for (let i = 0; i < sectionIndex; i++) {
    count += QUESTIONNAIRE_SECTIONS[i].questions.length;
  }
  return count + questionIndex + 1;
}

function getTotalQuestions(): number {
  return QUESTIONNAIRE_SECTIONS.reduce(
    (total, section) => total + section.questions.length,
    0
  );
}

export const useQuestionnaireStore = create<QuestionnaireState>()(
  persist(
    (set, get) => ({
      currentSectionIndex: 0,
      currentQuestionIndex: 0,
      responses: {},
      isSubmitting: false,

      setResponse: (key, value) => {
        set((state) => ({
          responses: {
            ...state.responses,
            [key]: value,
          },
        }));
      },

      nextQuestion: () => {
        const { currentSectionIndex, currentQuestionIndex } = get();
        const currentSection = QUESTIONNAIRE_SECTIONS[currentSectionIndex];

        // Check if we can move to the next question in the current section
        if (currentQuestionIndex < currentSection.questions.length - 1) {
          set({ currentQuestionIndex: currentQuestionIndex + 1 });
          return true;
        }

        // Check if we can move to the next section
        if (currentSectionIndex < QUESTIONNAIRE_SECTIONS.length - 1) {
          set({
            currentSectionIndex: currentSectionIndex + 1,
            currentQuestionIndex: 0,
          });
          return true;
        }

        // We're at the end
        return false;
      },

      prevQuestion: () => {
        const { currentSectionIndex, currentQuestionIndex } = get();

        // Check if we can move to the previous question in the current section
        if (currentQuestionIndex > 0) {
          set({ currentQuestionIndex: currentQuestionIndex - 1 });
          return true;
        }

        // Check if we can move to the previous section
        if (currentSectionIndex > 0) {
          const prevSection = QUESTIONNAIRE_SECTIONS[currentSectionIndex - 1];
          set({
            currentSectionIndex: currentSectionIndex - 1,
            currentQuestionIndex: prevSection.questions.length - 1,
          });
          return true;
        }

        // We're at the beginning
        return false;
      },

      goToSection: (sectionIndex: number) => {
        if (sectionIndex >= 0 && sectionIndex < QUESTIONNAIRE_SECTIONS.length) {
          set({
            currentSectionIndex: sectionIndex,
            currentQuestionIndex: 0,
          });
        }
      },

      getProgress: () => {
        const { currentSectionIndex, currentQuestionIndex } = get();
        const currentQuestion = calculateCurrentQuestionNumber(
          currentSectionIndex,
          currentQuestionIndex
        );
        const totalQuestions = getTotalQuestions();
        const percentage = Math.round((currentQuestion / totalQuestions) * 100);
        const sectionProgress = `Section ${currentSectionIndex + 1} of ${QUESTIONNAIRE_SECTIONS.length}`;

        return {
          currentQuestion,
          totalQuestions,
          percentage,
          sectionProgress,
        };
      },

      canProceed: () => {
        const { currentSectionIndex, currentQuestionIndex, responses } = get();
        const currentSection = QUESTIONNAIRE_SECTIONS[currentSectionIndex];
        const currentQuestion = currentSection.questions[currentQuestionIndex];

        // If the question is not required, we can always proceed
        if (!currentQuestion.required) {
          return true;
        }

        // Check if there's a response for this question
        const response = responses[currentQuestion.id];

        // For multi-select-custom, count both predefined and custom values
        if (currentQuestion.type === "multi-select-custom") {
          const predefinedCount = Array.isArray(response) ? response.length : 0;
          const customFieldId = currentQuestion.customFieldId;
          const customValues = customFieldId ? responses[customFieldId] : [];
          const customCount = Array.isArray(customValues) ? customValues.length : 0;
          const totalCount = predefinedCount + customCount;
          const minSelections = currentQuestion.minSelections || 1;
          return totalCount >= minSelections;
        }

        // For multi-select questions, check minimum selections
        if (
          currentQuestion.type === "multi-select" ||
          currentQuestion.type === "rank"
        ) {
          if (!Array.isArray(response)) return false;
          const minSelections = currentQuestion.minSelections || 1;
          return response.length >= minSelections;
        }

        // For single-select and other types, just check if there's a value
        return response !== undefined && response !== "" && response !== null;
      },

      reset: () => {
        set({
          currentSectionIndex: 0,
          currentQuestionIndex: 0,
          responses: {},
          isSubmitting: false,
        });
      },

      setSubmitting: (isSubmitting: boolean) => {
        set({ isSubmitting });
      },
    }),
    {
      name: "networknav-questionnaire",
      partialize: (state) => ({
        currentSectionIndex: state.currentSectionIndex,
        currentQuestionIndex: state.currentQuestionIndex,
        responses: state.responses,
      }),
    }
  )
);

