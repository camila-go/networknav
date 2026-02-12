import { describe, it, expect } from "vitest";
import {
  QUESTIONNAIRE_SECTIONS,
  getTotalQuestions,
  getRequiredQuestions,
  getSectionProgress,
  getSectionById,
  getQuestionById,
} from "./questionnaire-data";

describe("QUESTIONNAIRE_SECTIONS", () => {
  it("should have exactly 3 sections", () => {
    expect(QUESTIONNAIRE_SECTIONS).toHaveLength(3);
  });

  it("should have 10 total questions across all sections", () => {
    const total = QUESTIONNAIRE_SECTIONS.reduce(
      (sum, section) => sum + section.questions.length,
      0
    );
    expect(total).toBe(10);
  });

  it("should have unique section IDs", () => {
    const ids = QUESTIONNAIRE_SECTIONS.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have unique question IDs across all sections", () => {
    const allQuestionIds: string[] = [];
    for (const section of QUESTIONNAIRE_SECTIONS) {
      for (const question of section.questions) {
        allQuestionIds.push(question.id);
      }
    }
    const uniqueIds = new Set(allQuestionIds);
    expect(uniqueIds.size).toBe(allQuestionIds.length);
  });

  describe("Section 1: Leadership Context", () => {
    const section = QUESTIONNAIRE_SECTIONS[0];

    it("should be titled correctly", () => {
      expect(section.title).toBe("Your Leadership Context");
    });

    it("should have 3 questions", () => {
      expect(section.questions).toHaveLength(3);
    });

    it("should have all required questions", () => {
      const allRequired = section.questions.every((q) => q.required);
      expect(allRequired).toBe(true);
    });

    it("should include industry, yearsExperience, leadershipLevel", () => {
      const questionIds = section.questions.map((q) => q.id);
      expect(questionIds).toContain("industry");
      expect(questionIds).toContain("yearsExperience");
      expect(questionIds).toContain("leadershipLevel");
    });
  });

  describe("Section 2: Goals & Interests", () => {
    const section = QUESTIONNAIRE_SECTIONS[1];

    it("should be titled correctly", () => {
      expect(section.title).toBe("Your Goals & Interests");
    });

    it("should have 3 questions", () => {
      expect(section.questions).toHaveLength(3);
    });

    it("should have multi-select questions with proper limits", () => {
      for (const question of section.questions) {
        if (question.type === "multi-select" || question.type === "multi-select-custom") {
          expect(question.minSelections).toBeDefined();
          expect(question.maxSelections).toBeDefined();
          expect(question.minSelections).toBeLessThanOrEqual(
            question.maxSelections!
          );
        }
      }
    });
  });

  describe("Section 3: Your Style", () => {
    const section = QUESTIONNAIRE_SECTIONS[2];

    it("should be titled correctly", () => {
      expect(section.title).toBe("Your Style");
    });

    it("should have 4 questions", () => {
      expect(section.questions).toHaveLength(4);
    });

    it("should have all required questions", () => {
      const allRequired = section.questions.every((q) => q.required);
      expect(allRequired).toBe(true);
    });

    it("should include a multi-select question for relationship values", () => {
      const multiSelectQuestion = section.questions.find(
        (q) => q.id === "relationshipValues"
      );
      expect(multiSelectQuestion).toBeDefined();
      expect(multiSelectQuestion?.type).toBe("multi-select");
    });
  });

  describe("Question Options", () => {
    it("all single-select and multi-select questions should have options", () => {
      for (const section of QUESTIONNAIRE_SECTIONS) {
        for (const question of section.questions) {
          if (
            question.type === "single-select" ||
            question.type === "multi-select" ||
            question.type === "multi-select-custom" ||
            question.type === "icon-select" ||
            question.type === "rank"
          ) {
            expect(question.options).toBeDefined();
            expect(question.options!.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it("all options should have value and label", () => {
      for (const section of QUESTIONNAIRE_SECTIONS) {
        for (const question of section.questions) {
          if (question.options) {
            for (const option of question.options) {
              expect(option.value).toBeDefined();
              expect(option.value.length).toBeGreaterThan(0);
              expect(option.label).toBeDefined();
              expect(option.label.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it("all options within a question should have unique values", () => {
      for (const section of QUESTIONNAIRE_SECTIONS) {
        for (const question of section.questions) {
          if (question.options) {
            const values = question.options.map((o) => o.value);
            const uniqueValues = new Set(values);
            expect(uniqueValues.size).toBe(values.length);
          }
        }
      }
    });
  });
});

describe("getTotalQuestions", () => {
  it("should return 10 total questions", () => {
    expect(getTotalQuestions()).toBe(10);
  });
});

describe("getRequiredQuestions", () => {
  it("should return the correct number of required questions", () => {
    const required = getRequiredQuestions();
    // All 10 questions are required: Section 1 (3) + Section 2 (3) + Section 3 (4) = 10
    expect(required).toBe(10);
  });

  it("should be less than or equal to total questions", () => {
    expect(getRequiredQuestions()).toBeLessThanOrEqual(getTotalQuestions());
  });
});

describe("getSectionProgress", () => {
  it("should return 33% for section 0 of 3", () => {
    expect(getSectionProgress(0, 3)).toBe(33);
  });

  it("should return 67% for section 1 of 3", () => {
    expect(getSectionProgress(1, 3)).toBe(67);
  });

  it("should return 100% for section 2 of 3", () => {
    expect(getSectionProgress(2, 3)).toBe(100);
  });

  it("should work with default total sections", () => {
    expect(getSectionProgress(0)).toBe(33);
    expect(getSectionProgress(2)).toBe(100);
  });
});

describe("getSectionById", () => {
  it("should return the correct section by ID", () => {
    const section = getSectionById("leadership-context");
    expect(section).toBeDefined();
    expect(section?.title).toBe("Your Leadership Context");
  });

  it("should return undefined for non-existent ID", () => {
    const section = getSectionById("non-existent");
    expect(section).toBeUndefined();
  });

  it("should find all sections by their IDs", () => {
    const expectedIds = [
      "leadership-context",
      "goals-interests",
      "leadership-style",
    ];

    for (const id of expectedIds) {
      expect(getSectionById(id)).toBeDefined();
    }
  });
});

describe("getQuestionById", () => {
  it("should return the correct question and its section", () => {
    const result = getQuestionById("industry");
    expect(result).toBeDefined();
    expect(result?.question.id).toBe("industry");
    expect(result?.section.id).toBe("leadership-context");
  });

  it("should return undefined for non-existent question", () => {
    const result = getQuestionById("non-existent");
    expect(result).toBeUndefined();
  });

  it("should find questions from different sections", () => {
    // Section 1
    expect(getQuestionById("industry")?.section.id).toBe("leadership-context");

    // Section 2
    expect(getQuestionById("leadershipPriorities")?.section.id).toBe(
      "goals-interests"
    );

    // Section 2
    expect(getQuestionById("rechargeActivities")?.section.id).toBe(
      "goals-interests"
    );

    // Section 3
    expect(getQuestionById("leadershipPhilosophy")?.section.id).toBe(
      "leadership-style"
    );
  });
});

describe("Questionnaire Data Integrity", () => {
  it("should have proper icons for sections", () => {
    for (const section of QUESTIONNAIRE_SECTIONS) {
      expect(section.icon).toBeDefined();
      expect(section.icon.length).toBeGreaterThan(0);
    }
  });

  it("should have subtitles for all sections", () => {
    for (const section of QUESTIONNAIRE_SECTIONS) {
      expect(section.subtitle).toBeDefined();
      expect(section.subtitle.length).toBeGreaterThan(0);
    }
  });

  it("multi-select questions should have reasonable limits", () => {
    for (const section of QUESTIONNAIRE_SECTIONS) {
      for (const question of section.questions) {
        if (
          (question.type === "multi-select" || question.type === "multi-select-custom") &&
          question.options
        ) {
          if (question.maxSelections) {
            // Max selections should not exceed available options
            expect(question.maxSelections).toBeLessThanOrEqual(
              question.options.length
            );
          }
        }
      }
    }
  });
});
