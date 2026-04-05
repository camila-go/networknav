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

  it("should have 11 base questions (conditional refinedInterest added in wizard only)", () => {
    expect(getTotalQuestions()).toBe(11);
  });

  it("should have unique section IDs", () => {
    const ids = QUESTIONNAIRE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have unique question IDs across all sections", () => {
    const allQuestionIds: string[] = [];
    for (const section of QUESTIONNAIRE_SECTIONS) {
      for (const question of section.questions) {
        allQuestionIds.push(question.id);
      }
    }
    expect(new Set(allQuestionIds).size).toBe(allQuestionIds.length);
  });

  it("section 1 includes role summary and archetype", () => {
    const ids = QUESTIONNAIRE_SECTIONS[0].questions.map((q) => q.id);
    expect(ids).toContain("roleSummary");
    expect(ids).toContain("archetype");
    expect(ids).toContain("talkTopic");
  });

  it("section 2 includes personality tags", () => {
    const ids = QUESTIONNAIRE_SECTIONS[1].questions.map((q) => q.id);
    expect(ids).toContain("personalityTags");
  });

  it("section 3 includes headline and fun fact", () => {
    const ids = QUESTIONNAIRE_SECTIONS[2].questions.map((q) => q.id);
    expect(ids).toContain("headline");
    expect(ids).toContain("funFact");
  });
});

describe("getRequiredQuestions", () => {
  it("should be less than or equal to total questions", () => {
    expect(getRequiredQuestions()).toBeLessThanOrEqual(getTotalQuestions());
  });
});

describe("getSectionProgress", () => {
  it("should return 33% for section 0 of 3", () => {
    expect(getSectionProgress(0, 3)).toBe(33);
  });

  it("should return 100% for section 2 of 3", () => {
    expect(getSectionProgress(2, 3)).toBe(100);
  });
});

describe("getSectionById", () => {
  it("should return the correct section by ID", () => {
    const section = getSectionById("getting-to-know-you");
    expect(section).toBeDefined();
    expect(section?.title).toBe("Getting to know you");
  });

  it("should return undefined for non-existent ID", () => {
    expect(getSectionById("non-existent")).toBeUndefined();
  });
});

describe("getQuestionById", () => {
  it("should return archetype in first section", () => {
    const result = getQuestionById("archetype");
    expect(result?.question.id).toBe("archetype");
    expect(result?.section.id).toBe("getting-to-know-you");
  });

  it("should return undefined for non-existent question", () => {
    expect(getQuestionById("non-existent")).toBeUndefined();
  });
});
