/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useQuestionnaireStore } from "./questionnaire-store";
import { QUESTIONNAIRE_SECTIONS } from "./questionnaire-data";

describe("Questionnaire Store", () => {
  beforeEach(() => {
    useQuestionnaireStore.getState().reset();
  });

  describe("Initial state", () => {
    it("should start at section 0, question 0", () => {
      const state = useQuestionnaireStore.getState();
      expect(state.currentSectionIndex).toBe(0);
      expect(state.currentQuestionIndex).toBe(0);
    });

    it("should start with empty responses", () => {
      expect(useQuestionnaireStore.getState().responses).toEqual({});
    });
  });

  describe("setResponse", () => {
    it("should set text and single-select responses", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("roleSummary", "I build teams");
      store.setResponse("archetype", "builder");

      const responses = useQuestionnaireStore.getState().responses;
      expect(responses.roleSummary).toBe("I build teams");
      expect(responses.archetype).toBe("builder");
    });

    it("should handle multi-select", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("teamQualities", ["energy", "ideas"]);
      expect(useQuestionnaireStore.getState().responses.teamQualities).toEqual([
        "energy",
        "ideas",
      ]);
    });
  });

  describe("nextQuestion / prevQuestion", () => {
    it("should move within section", () => {
      const store = useQuestionnaireStore.getState();
      expect(store.nextQuestion()).toBe(true);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(1);
    });

    it("should advance to next section after last question in section", () => {
      const store = useQuestionnaireStore.getState();
      const n = QUESTIONNAIRE_SECTIONS[0].questions.length;
      for (let i = 0; i < n - 1; i++) {
        store.nextQuestion();
      }
      expect(store.nextQuestion()).toBe(true);
      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(1);
      expect(useQuestionnaireStore.getState().currentQuestionIndex).toBe(0);
    });

    it("should return false at end of questionnaire", () => {
      const store = useQuestionnaireStore.getState();
      let total = 0;
      for (const s of QUESTIONNAIRE_SECTIONS) {
        total += s.questions.length;
      }
      for (let i = 0; i < total - 1; i++) {
        store.nextQuestion();
      }
      expect(store.nextQuestion()).toBe(false);
    });

    it("prevQuestion from start returns false", () => {
      expect(useQuestionnaireStore.getState().prevQuestion()).toBe(false);
    });
  });

  describe("getProgress", () => {
    it("should reflect total question count", () => {
      const progress = useQuestionnaireStore.getState().getProgress();
      expect(progress.totalQuestions).toBe(11);
      expect(progress.currentQuestion).toBe(1);
    });
  });

  describe("canProceed", () => {
    it("should be false without answer on required text question", () => {
      expect(useQuestionnaireStore.getState().canProceed()).toBe(false);
    });

    it("should be true after answering current question", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("roleSummary", "I ship products");
      expect(store.canProceed()).toBe(true);
    });

    it("should enforce multi-select minimum on teamQualities", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("roleSummary", "I lead teams");
      store.nextQuestion();
      store.setResponse("archetype", "connector");
      store.nextQuestion();
      store.setResponse("teamQualities", []);
      expect(store.canProceed()).toBe(false);
      store.setResponse("teamQualities", ["energy"]);
      expect(store.canProceed()).toBe(true);
    });
  });

  describe("reset", () => {
    it("should clear state", () => {
      const store = useQuestionnaireStore.getState();
      store.setResponse("archetype", "analyst");
      store.nextQuestion();
      store.reset();
      expect(useQuestionnaireStore.getState().responses).toEqual({});
      expect(useQuestionnaireStore.getState().currentSectionIndex).toBe(0);
    });
  });
});

