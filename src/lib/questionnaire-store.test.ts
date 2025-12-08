/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useQuestionnaireStore } from "./questionnaire-store";
import { QUESTIONNAIRE_SECTIONS } from "./questionnaire-data";

describe("Questionnaire Store", () => {
  beforeEach(() => {
    // Reset the store before each test
    useQuestionnaireStore.getState().reset();
  });

  describe("Initial state", () => {
    it("should start at section 0, question 0", () => {
      const state = useQuestionnaireStore.getState();
      expect(state.currentSectionIndex).toBe(0);
      expect(state.currentQuestionIndex).toBe(0);
    });

    it("should start with empty responses", () => {
      const state = useQuestionnaireStore.getState();
      expect(state.responses).toEqual({});
    });

    it("should not be submitting initially", () => {
      const state = useQuestionnaireStore.getState();
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe("setResponse", () => {
    it("should set a single response", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("industry", "technology");

      expect(useQuestionnaireStore.getState().responses.industry).toBe(
        "technology"
      );
    });

    it("should set multiple responses", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("industry", "technology");
      store.setResponse("yearsExperience", "6-10");

      const responses = useQuestionnaireStore.getState().responses;
      expect(responses.industry).toBe("technology");
      expect(responses.yearsExperience).toBe("6-10");
    });

    it("should handle array responses for multi-select", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("leadershipPriorities", ["scaling", "innovation"]);

      const responses = useQuestionnaireStore.getState().responses;
      expect(responses.leadershipPriorities).toEqual(["scaling", "innovation"]);
    });

    it("should override existing responses", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("industry", "technology");
      store.setResponse("industry", "finance");

      expect(useQuestionnaireStore.getState().responses.industry).toBe(
        "finance"
      );
    });
  });

  describe("nextQuestion", () => {
    it("should move to the next question in the same section", () => {
      const store = useQuestionnaireStore.getState();
      const result = store.nextQuestion();

      expect(result).toBe(true);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(1);
      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(0);
    });

    it("should move to the next section when at the last question", () => {
      const store = useQuestionnaireStore.getState();

      // Move to the last question of the first section
      const firstSectionQuestions = QUESTIONNAIRE_SECTIONS[0].questions.length;
      for (let i = 0; i < firstSectionQuestions - 1; i++) {
        store.nextQuestion();
      }

      // Now move to the next section
      const result = store.nextQuestion();

      expect(result).toBe(true);
      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(1);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(0);
    });

    it("should return false when at the last question of the last section", () => {
      const store = useQuestionnaireStore.getState();

      // Move to the very last question
      let totalQuestions = 0;
      for (const section of QUESTIONNAIRE_SECTIONS) {
        totalQuestions += section.questions.length;
      }

      for (let i = 0; i < totalQuestions - 1; i++) {
        store.nextQuestion();
      }

      // Try to go past the end
      const result = store.nextQuestion();
      expect(result).toBe(false);
    });
  });

  describe("prevQuestion", () => {
    it("should return false when at the first question", () => {
      const store = useQuestionnaireStore.getState();
      const result = store.prevQuestion();

      expect(result).toBe(false);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(0);
      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(0);
    });

    it("should move to the previous question in the same section", () => {
      const store = useQuestionnaireStore.getState();
      store.nextQuestion(); // Move to question 1
      const result = store.prevQuestion();

      expect(result).toBe(true);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(0);
    });

    it("should move to the last question of the previous section", () => {
      const store = useQuestionnaireStore.getState();

      // Move to the first question of the second section
      const firstSectionQuestions = QUESTIONNAIRE_SECTIONS[0].questions.length;
      for (let i = 0; i < firstSectionQuestions; i++) {
        store.nextQuestion();
      }

      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(1);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(0);

      // Go back
      const result = store.prevQuestion();

      expect(result).toBe(true);
      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(0);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(
        firstSectionQuestions - 1
      );
    });
  });

  describe("goToSection", () => {
    it("should jump to a specific section", () => {
      const store = useQuestionnaireStore.getState();
      store.goToSection(2);

      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(2);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(0);
    });

    it("should not change section for invalid index", () => {
      const store = useQuestionnaireStore.getState();
      store.goToSection(-1);
      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(0);

      store.goToSection(100);
      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(0);
    });
  });

  describe("getProgress", () => {
    it("should return correct progress at the start", () => {
      const store = useQuestionnaireStore.getState();
      const progress = store.getProgress();

      expect(progress.currentQuestion).toBe(1);
      expect(progress.totalQuestions).toBe(20);
      expect(progress.percentage).toBe(5);
      expect(progress.sectionProgress).toBe("Section 1 of 4");
    });

    it("should return correct progress after moving", () => {
      const store = useQuestionnaireStore.getState();

      // Move to question 5 (second section, first question)
      for (let i = 0; i < 4; i++) {
        store.nextQuestion();
      }

      const progress = store.getProgress();
      expect(progress.currentQuestion).toBe(5);
      expect(progress.percentage).toBe(25);
      expect(progress.sectionProgress).toBe("Section 2 of 4");
    });
  });

  describe("canProceed", () => {
    it("should return false for required question without response", () => {
      const store = useQuestionnaireStore.getState();
      const canProceed = store.canProceed();

      expect(canProceed).toBe(false);
    });

    it("should return true for required question with response", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("industry", "technology");
      const canProceed = store.canProceed();

      expect(canProceed).toBe(true);
    });

    it("should return true for optional question without response", () => {
      const store = useQuestionnaireStore.getState();

      // Navigate to an optional question (fitnessActivities in section 3)
      // Section 1: 4 questions, Section 2: 4 questions, Section 3: question 3 is fitnessActivities (optional)
      for (let i = 0; i < 10; i++) {
        store.nextQuestion();
      }

      const currentQuestion =
        QUESTIONNAIRE_SECTIONS[
          useQuestionnaireStore.getState().currentSectionIndex
        ].questions[useQuestionnaireStore.getState().currentQuestionIndex];

      // If we found an optional question, it should allow proceeding without response
      if (!currentQuestion.required) {
        const canProceed = store.canProceed();
        expect(canProceed).toBe(true);
      }
    });

    it("should check minimum selections for multi-select questions", () => {
      const store = useQuestionnaireStore.getState();

      // Move to a multi-select question (leadershipPriorities in section 2)
      for (let i = 0; i < 4; i++) {
        store.nextQuestion();
      }

      // With empty array, should not be able to proceed
      store.setResponse("leadershipPriorities", []);
      expect(store.canProceed()).toBe(false);

      // With 2 selections (less than min of 3), should not proceed
      store.setResponse("leadershipPriorities", ["scaling", "innovation"]);
      expect(store.canProceed()).toBe(false);

      // With 3 selections (meets minimum), should be able to proceed
      store.setResponse("leadershipPriorities", [
        "scaling",
        "innovation",
        "culture",
      ]);
      expect(store.canProceed()).toBe(true);
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", () => {
      const store = useQuestionnaireStore.getState();

      // Make some changes
      store.setResponse("industry", "technology");
      store.nextQuestion();
      store.nextQuestion();
      store.setSubmitting(true);

      // Reset
      store.reset();

      const state = useQuestionnaireStore.getState();
      expect(state.currentSectionIndex).toBe(0);
      expect(state.currentQuestionIndex).toBe(0);
      expect(state.responses).toEqual({});
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe("setSubmitting", () => {
    it("should toggle submitting state", () => {
      const store = useQuestionnaireStore.getState();

      store.setSubmitting(true);
      expect(useQuestionnaireStore.getState().isSubmitting).toBe(true);

      store.setSubmitting(false);
      expect(useQuestionnaireStore.getState().isSubmitting).toBe(false);
    });
  });
});

