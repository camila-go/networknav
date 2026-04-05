/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  extractItemsets,
  calculateJaccardSimilarity,
  calculateWeightedSimilarity,
  findSharedAttributes,
  findComplementaryAttributes,
  calculateMatchScore,
  calculateTextFieldOverlap,
  determineMatchType,
  generateConversationStarters,
  hasUsableQuestionnaire,
} from "./market-basket-analysis";
import type { QuestionnaireData } from "@/types";

/** Summit 2026 questionnaire shape — similar profiles (shared archetype + overlapping answers). */
const summitSimilarA: Partial<QuestionnaireData> = {
  roleSummary: "I lead product engineering teams building AI tooling",
  archetype: "builder",
  teamQualities: ["perspective", "collaboration", "problem-solving"],
  growthArea: "storytelling for executives",
  talkTopic: "machine learning ethics in healthcare delivery",
  personalInterest: "trail running and science fiction novels",
  personalityTags: ["planner", "early-bird", "social"],
  joyTrigger: "quiet coffee on the porch",
  threeWords: "curious practical kind",
  headline: "Here to learn and connect with peers",
  funFact: "Visited twenty national parks",
};

const summitSimilarB: Partial<QuestionnaireData> = {
  roleSummary: "I build data platforms for hospital systems",
  archetype: "builder",
  teamQualities: ["collaboration", "ideas", "problem-solving"],
  growthArea: "public speaking and presence",
  talkTopic: "healthcare machine learning and responsible AI",
  personalInterest: "hiking trails and reading science fiction",
  personalityTags: ["planner", "social", "recharge-solo"],
  joyTrigger: "morning coffee ritual",
  threeWords: "curious driven collaborative",
  headline: "Learning from everyone this summit",
  funFact: "Teaching myself cello as an adult",
};

/** Different archetype + disjoint interests — low affinity, may pick up strategic complement pairs. */
const summitDifferent: Partial<QuestionnaireData> = {
  roleSummary: "Finance operations at a global enterprise",
  archetype: "analyst",
  teamQualities: ["energy", "ideas"],
  growthArea: "macroeconomics and policy",
  talkTopic: "wine regions across Europe",
  personalInterest: "wine tasting and golf weekends",
  personalityTags: ["night-owl", "go-with-the-flow"],
  joyTrigger: "late night jazz sets",
  threeWords: "precise calm analytical",
  headline: "Focused on capital efficiency conversations",
  funFact: "Certified sommelier",
};

describe("Market Basket Analysis", () => {
  describe("hasUsableQuestionnaire", () => {
    it("is false for empty or non-objects", () => {
      expect(hasUsableQuestionnaire(null)).toBe(false);
      expect(hasUsableQuestionnaire(undefined)).toBe(false);
      expect(hasUsableQuestionnaire({})).toBe(false);
    });

    it("is true when at least one known field is filled", () => {
      expect(hasUsableQuestionnaire({ archetype: "builder" })).toBe(true);
    });
  });

  describe("calculateTextFieldOverlap", () => {
    it("returns positive overlap when free-text shares tokens", () => {
      const a: Partial<QuestionnaireData> = { talkTopic: "machine learning in healthcare" };
      const b: Partial<QuestionnaireData> = {
        talkTopic: "healthcare applications of machine learning systems",
      };
      expect(calculateTextFieldOverlap(a, b)).toBeGreaterThan(0.2);
    });

    it("returns 0 when no overlapping text fields", () => {
      expect(
        calculateTextFieldOverlap(
          { talkTopic: "quantum physics" },
          { talkTopic: "Italian cooking sauces" }
        )
      ).toBe(0);
    });
  });

  describe("extractItemsets", () => {
    it("should extract single-value attributes as items", () => {
      const items = extractItemsets({ archetype: "builder" });
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        attribute: "archetype",
        value: "builder",
        category: "professional",
      });
    });

    it("should extract multi-value attributes as separate items", () => {
      const items = extractItemsets({
        teamQualities: ["perspective", "collaboration"],
      });
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.value)).toContain("perspective");
      expect(items.map((i) => i.value)).toContain("collaboration");
    });

    it("should include weights from configuration", () => {
      const items = extractItemsets({ archetype: "strategist" });
      expect(items[0].weight).toBeGreaterThan(0);
      expect(items[0].weight).toBeLessThanOrEqual(1);
    });

    it("should handle empty responses", () => {
      const items = extractItemsets({});
      expect(items).toHaveLength(0);
    });

    it("should ignore null/undefined values", () => {
      const items = extractItemsets({
        archetype: "builder",
        growthArea: undefined,
        roleSummary: "",
      });
      expect(items).toHaveLength(1);
    });

    it("should extract complete summit profile", () => {
      const items = extractItemsets(summitSimilarA);
      expect(items.length).toBeGreaterThan(8);
      const categories = items.map((i) => i.category);
      expect(categories).toContain("professional");
      expect(categories).toContain("hobby");
    });
  });

  describe("calculateJaccardSimilarity", () => {
    it("should return 1 for identical itemsets", () => {
      const items = extractItemsets(summitSimilarA);
      const similarity = calculateJaccardSimilarity(items, items);
      expect(similarity).toBe(1);
    });

    it("should return 0 for completely different itemsets", () => {
      const items1 = extractItemsets({ archetype: "builder" });
      const items2 = extractItemsets({ archetype: "analyst" });
      const similarity = calculateJaccardSimilarity(items1, items2);
      expect(similarity).toBe(0);
    });

    it("should return value between 0 and 1 for partial overlap", () => {
      const items1 = extractItemsets(summitSimilarA);
      const items2 = extractItemsets(summitSimilarB);
      const similarity = calculateJaccardSimilarity(items1, items2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it("should handle empty itemsets", () => {
      const items1 = extractItemsets({});
      const items2 = extractItemsets({ archetype: "builder" });
      const similarity = calculateJaccardSimilarity(items1, items2);
      expect(similarity).toBe(0);
    });
  });

  describe("calculateWeightedSimilarity", () => {
    it("should return 1 for identical itemsets", () => {
      const items = extractItemsets(summitSimilarA);
      const similarity = calculateWeightedSimilarity(items, items);
      expect(similarity).toBe(1);
    });

    it("should weight overlapping multi-select more when org-wide match holds", () => {
      const items1 = extractItemsets({
        archetype: "builder",
        teamQualities: ["perspective"],
      });
      const items2 = extractItemsets({
        archetype: "builder",
        teamQualities: ["perspective", "ideas"],
      });
      const items3 = extractItemsets({
        archetype: "strategist",
        teamQualities: ["perspective"],
      });

      const simSharedArchetypeAndQuality = calculateWeightedSimilarity(items1, items2);
      const simOnlyQuality = calculateWeightedSimilarity(items1, items3);

      expect(simSharedArchetypeAndQuality).toBeGreaterThan(simOnlyQuality);
    });

    it("should handle similar users with high score", () => {
      const items1 = extractItemsets(summitSimilarA);
      const items2 = extractItemsets(summitSimilarB);
      const similarity = calculateWeightedSimilarity(items1, items2);
      expect(similarity).toBeGreaterThan(0.3);
    });

    it("should handle different users with lower structured overlap", () => {
      const items1 = extractItemsets(summitSimilarA);
      const items3 = extractItemsets(summitDifferent);
      const similarity = calculateWeightedSimilarity(items1, items3);
      expect(similarity).toBeLessThan(0.35);
    });
  });

  describe("findSharedAttributes", () => {
    it("should find all shared attributes between similar users", () => {
      const items1 = extractItemsets(summitSimilarA);
      const items2 = extractItemsets(summitSimilarB);
      const shared = findSharedAttributes(items1, items2);

      expect(shared.length).toBeGreaterThan(0);
      expect(shared.some((s) => s.description.includes("Builder"))).toBe(true);
    });

    it("should return empty array for disjoint archetype values", () => {
      const items1 = extractItemsets({ archetype: "builder" });
      const items2 = extractItemsets({ archetype: "analyst" });
      const shared = findSharedAttributes(items1, items2);

      expect(shared).toHaveLength(0);
    });

    it("should sort commonalities by weight", () => {
      const items1 = extractItemsets(summitSimilarA);
      const items2 = extractItemsets(summitSimilarB);
      const shared = findSharedAttributes(items1, items2);

      for (let i = 1; i < shared.length; i++) {
        expect(shared[i - 1].weight).toBeGreaterThanOrEqual(shared[i].weight);
      }
    });

    it("should deduplicate similar descriptions", () => {
      const items1 = extractItemsets(summitSimilarA);
      const items2 = extractItemsets(summitSimilarB);
      const shared = findSharedAttributes(items1, items2);

      const descriptions = shared.map((s) => s.description.toLowerCase());
      const uniqueDescriptions = new Set(descriptions);
      expect(descriptions.length).toBe(uniqueDescriptions.size);
    });
  });

  describe("findComplementaryAttributes", () => {
    it("should find complementary archetype pairs", () => {
      const items1 = extractItemsets({ archetype: "builder" });
      const items2 = extractItemsets({ archetype: "strategist" });
      const complementary = findComplementaryAttributes(items1, items2);

      expect(complementary.length).toBeGreaterThan(0);
      expect(
        complementary.some((c) => c.description.includes("Complementary"))
      ).toBe(true);
    });

    it("should return empty when both share the same archetype", () => {
      const items1 = extractItemsets({ archetype: "builder" });
      const items2 = extractItemsets({ archetype: "builder" });
      const complementary = findComplementaryAttributes(items1, items2);

      expect(complementary).toHaveLength(0);
    });
  });

  describe("calculateMatchScore", () => {
    it("should return high score for similar users", () => {
      const score = calculateMatchScore(summitSimilarA, summitSimilarB);
      expect(score.totalScore).toBeGreaterThan(0.3);
      expect(score.affinityScore).toBeGreaterThan(0.3);
    });

    it("should return low score for different users", () => {
      const score = calculateMatchScore(summitSimilarA, summitDifferent);
      expect(score.totalScore).toBeLessThan(0.45);
    });

    it("should include commonalities", () => {
      const score = calculateMatchScore(summitSimilarA, summitSimilarB);
      expect(score.commonalities.length).toBeGreaterThan(0);
      expect(score.commonalities.length).toBeLessThanOrEqual(5);
    });

    it("should calculate both affinity and strategic scores", () => {
      const score = calculateMatchScore(summitSimilarA, summitSimilarB);
      expect(score.affinityScore).toBeDefined();
      expect(score.strategicScore).toBeDefined();
      expect(score.affinityScore).toBeGreaterThanOrEqual(0);
      expect(score.strategicScore).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty responses", () => {
      const score = calculateMatchScore({}, summitSimilarA);
      expect(score.totalScore).toBe(0);
      expect(score.commonalities).toHaveLength(0);
    });
  });

  describe("determineMatchType", () => {
    it("should return high-affinity for similar summit profiles", () => {
      const score = calculateMatchScore(summitSimilarA, summitSimilarB);
      const type = determineMatchType(score);
      expect(type).toBe("high-affinity");
    });

    it("should return strategic when strategic score is dominant", () => {
      const matchScore = {
        totalScore: 0.5,
        commonalities: [],
        affinityScore: 0.2,
        strategicScore: 0.8,
      };
      const type = determineMatchType(matchScore);
      expect(type).toBe("strategic");
    });

    it("should return high-affinity when affinity is significantly higher", () => {
      const matchScore = {
        totalScore: 0.7,
        commonalities: [],
        affinityScore: 0.8,
        strategicScore: 0.3,
      };
      const type = determineMatchType(matchScore);
      expect(type).toBe("high-affinity");
    });

    it("should label builder + strategist as strategic when complement wins", () => {
      const builder: Partial<QuestionnaireData> = {
        archetype: "builder",
        teamQualities: ["energy"],
        talkTopic: "unrelated topic alpha",
        roleSummary: "role one",
        growthArea: "growth one",
        personalInterest: "hobby one",
        joyTrigger: "joy one",
        threeWords: "one two three",
        headline: "head one",
        funFact: "fact one",
      };
      const strategist: Partial<QuestionnaireData> = {
        archetype: "strategist",
        teamQualities: ["ideas"],
        talkTopic: "unrelated topic beta gamma",
        roleSummary: "role two",
        growthArea: "growth two",
        personalInterest: "hobby two",
        joyTrigger: "joy two",
        threeWords: "four five six",
        headline: "head two",
        funFact: "fact two",
      };
      const score = calculateMatchScore(builder, strategist);
      expect(determineMatchType(score)).toBe("strategic");
    });
  });

  describe("generateConversationStarters", () => {
    it("should generate starters based on commonalities", () => {
      const commonalities = [
        {
          category: "professional" as const,
          description: "Both lean Builder",
          weight: 0.9,
        },
        {
          category: "hobby" as const,
          description: "Life-outside-work: hiking",
          weight: 0.7,
        },
      ];
      const starters = generateConversationStarters(commonalities, "high-affinity");
      expect(starters.length).toBeGreaterThan(0);
      expect(starters.length).toBeLessThanOrEqual(3);
    });

    it("should generate different starters for strategic matches", () => {
      const commonalities = [
        {
          category: "professional" as const,
          description: "Complementary expertise",
          weight: 0.8,
        },
      ];
      const highAffinityStarters = generateConversationStarters(
        commonalities,
        "high-affinity"
      );
      const strategicStarters = generateConversationStarters(
        commonalities,
        "strategic"
      );

      expect(highAffinityStarters[0]).not.toBe(strategicStarters[0]);
    });

    it("should provide fallback starters for empty commonalities", () => {
      const starters = generateConversationStarters([], "high-affinity");
      expect(starters.length).toBeGreaterThan(0);
    });
  });
});

describe("Integration: Full Matching Pipeline", () => {
  it("should produce valid matches between summit profiles", () => {
    const score = calculateMatchScore(summitSimilarA, summitSimilarB);
    const matchType = determineMatchType(score);
    const starters = generateConversationStarters(score.commonalities, matchType);

    expect(score.totalScore).toBeGreaterThan(0.25);
    expect(score.commonalities.length).toBeGreaterThanOrEqual(1);
    expect(matchType).toBe("high-affinity");
    expect(starters.length).toBeGreaterThan(0);
  });

  it("should identify strategic matches for complementary archetypes", () => {
    const techLeader: Partial<QuestionnaireData> = {
      archetype: "builder",
      teamQualities: ["perspective", "problem-solving"],
      roleSummary: "Hands-on engineering leader",
      growthArea: "systems design",
      talkTopic: "platform engineering",
      personalInterest: "open source",
      personalityTags: ["planner", "social"],
      joyTrigger: "shipping releases",
      threeWords: "ship iterate learn",
      headline: "Building reliable infra",
      funFact: "Contributed to Linux drivers",
    };

    const financeLeader: Partial<QuestionnaireData> = {
      archetype: "strategist",
      teamQualities: ["ideas", "collaboration"],
      roleSummary: "Corporate strategy partner",
      growthArea: "capital markets",
      talkTopic: "portfolio risk modeling",
      personalInterest: "chess tournaments",
      personalityTags: ["night-owl", "planner"],
      joyTrigger: "complex spreadsheet models",
      threeWords: "structure options tradeoffs",
      headline: "Seeking operator perspectives",
      funFact: "Former debate national finalist",
    };

    const score = calculateMatchScore(techLeader, financeLeader);

    expect(score.strategicScore).toBeGreaterThan(0);
    expect(determineMatchType(score)).toBe("strategic");
    expect(
      score.commonalities.some(
        (c) =>
          c.description.includes("Complementary") ||
          c.description.includes("complementary")
      )
    ).toBe(true);
  });
});
