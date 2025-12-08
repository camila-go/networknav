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
  it("should have exactly 4 sections", () => {
    expect(QUESTIONNAIRE_SECTIONS).toHaveLength(4);
  });

  it("should have 20 total questions across all sections", () => {
    const total = QUESTIONNAIRE_SECTIONS.reduce(
      (sum, section) => sum + section.questions.length,
      0
    );
    expect(total).toBe(20);
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

    it("should have 4 questions", () => {
      expect(section.questions).toHaveLength(4);
    });

    it("should have all required questions", () => {
      const allRequired = section.questions.every((q) => q.required);
      expect(allRequired).toBe(true);
    });

    it("should include industry, yearsExperience, leadershipLevel, organizationSize", () => {
      const questionIds = section.questions.map((q) => q.id);
      expect(questionIds).toContain("industry");
      expect(questionIds).toContain("yearsExperience");
      expect(questionIds).toContain("leadershipLevel");
      expect(questionIds).toContain("organizationSize");
    });
  });

  describe("Section 2: Building & Solving", () => {
    const section = QUESTIONNAIRE_SECTIONS[1];

    it("should be titled correctly", () => {
      expect(section.title).toBe("What You're Building & Solving");
    });

    it("should have 4 questions", () => {
      expect(section.questions).toHaveLength(4);
    });

    it("should have multi-select questions with proper limits", () => {
      for (const question of section.questions) {
        if (question.type === "multi-select") {
          expect(question.minSelections).toBeDefined();
          expect(question.maxSelections).toBeDefined();
          expect(question.minSelections).toBeLessThanOrEqual(
            question.maxSelections!
          );
        }
      }
    });
  });

  describe("Section 3: Beyond the Boardroom", () => {
    const section = QUESTIONNAIRE_SECTIONS[2];

    it("should be titled correctly", () => {
      expect(section.title).toBe("Beyond the Boardroom");
    });

    it("should have 6 questions", () => {
      expect(section.questions).toHaveLength(6);
    });

    it("should have some optional questions", () => {
      const optionalQuestions = section.questions.filter((q) => !q.required);
      expect(optionalQuestions.length).toBeGreaterThan(0);
    });
  });

  describe("Section 4: Leadership Style", () => {
    const section = QUESTIONNAIRE_SECTIONS[3];

    it("should be titled correctly", () => {
      expect(section.title).toBe("Your Leadership Style");
    });

    it("should have 6 questions", () => {
      expect(section.questions).toHaveLength(6);
    });

    it("should include a rank-type question for relationship values", () => {
      const rankQuestion = section.questions.find((q) => q.type === "rank");
      expect(rankQuestion).toBeDefined();
      expect(rankQuestion?.id).toBe("relationshipValues");
    });
  });

  describe("Question Options", () => {
    it("all single-select and multi-select questions should have options", () => {
      for (const section of QUESTIONNAIRE_SECTIONS) {
        for (const question of section.questions) {
          if (
            question.type === "single-select" ||
            question.type === "multi-select" ||
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
  it("should return 20 total questions", () => {
    expect(getTotalQuestions()).toBe(20);
  });
});

describe("getRequiredQuestions", () => {
  it("should return the correct number of required questions", () => {
    const required = getRequiredQuestions();
    // Count manually: Section 1 (4) + Section 2 (4) + Section 3 (4 required) + Section 4 (5 required) = 17
    expect(required).toBe(17);
  });

  it("should be less than or equal to total questions", () => {
    expect(getRequiredQuestions()).toBeLessThanOrEqual(getTotalQuestions());
  });
});

describe("getSectionProgress", () => {
  it("should return 25% for section 0 of 4", () => {
    expect(getSectionProgress(0, 4)).toBe(25);
  });

  it("should return 50% for section 1 of 4", () => {
    expect(getSectionProgress(1, 4)).toBe(50);
  });

  it("should return 75% for section 2 of 4", () => {
    expect(getSectionProgress(2, 4)).toBe(75);
  });

  it("should return 100% for section 3 of 4", () => {
    expect(getSectionProgress(3, 4)).toBe(100);
  });

  it("should work with default total sections", () => {
    expect(getSectionProgress(0)).toBe(25);
    expect(getSectionProgress(3)).toBe(100);
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
      "building-solving",
      "beyond-boardroom",
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
      "building-solving"
    );

    // Section 3
    expect(getQuestionById("rechargeActivities")?.section.id).toBe(
      "beyond-boardroom"
    );

    // Section 4
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
        if (question.type === "multi-select" && question.options) {
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

