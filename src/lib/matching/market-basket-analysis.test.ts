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
  determineMatchType,
  generateConversationStarters,
} from "./market-basket-analysis";
import type { QuestionnaireData } from "@/types";

describe("Market Basket Analysis", () => {
  // Sample user responses for testing
  const user1Responses: Partial<QuestionnaireData> = {
    industry: "technology",
    yearsExperience: "6-10",
    leadershipLevel: "vp",
    organizationSize: "mid-size",
    leadershipPriorities: ["scaling", "innovation", "culture"],
    leadershipChallenges: ["talent", "change"],
    growthAreas: ["strategic", "teams"],
    rechargeActivities: ["reading", "hiking", "travel"],
    contentPreferences: ["business", "science"],
    leadershipPhilosophy: ["servant", "results"],
    decisionMakingStyle: "collaborative",
    communicationStyle: "direct",
  };

  const user2SimilarResponses: Partial<QuestionnaireData> = {
    industry: "technology",
    yearsExperience: "6-10",
    leadershipLevel: "director",
    organizationSize: "mid-size",
    leadershipPriorities: ["scaling", "mentoring", "culture"],
    leadershipChallenges: ["talent", "priorities"],
    growthAreas: ["strategic", "presence"],
    rechargeActivities: ["reading", "hiking", "gaming"],
    contentPreferences: ["business", "entrepreneurship"],
    leadershipPhilosophy: ["servant", "coach"],
    decisionMakingStyle: "collaborative",
    communicationStyle: "warm",
  };

  const user3DifferentResponses: Partial<QuestionnaireData> = {
    industry: "healthcare",
    yearsExperience: "16-20",
    leadershipLevel: "c-suite",
    organizationSize: "enterprise",
    leadershipPriorities: ["transformation", "financial"],
    leadershipChallenges: ["budget", "disruption"],
    growthAreas: ["financial-acumen", "digital"],
    rechargeActivities: ["golf", "wine-tasting"],
    contentPreferences: ["news", "global"],
    leadershipPhilosophy: ["visionary", "decisive"],
    decisionMakingStyle: "decisive",
    communicationStyle: "facts-first",
  };

  describe("extractItemsets", () => {
    it("should extract single-value attributes as items", () => {
      const items = extractItemsets({ industry: "technology" });
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        attribute: "industry",
        value: "technology",
        category: "professional",
      });
    });

    it("should extract multi-value attributes as separate items", () => {
      const items = extractItemsets({
        leadershipPriorities: ["scaling", "innovation"],
      });
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.value)).toContain("scaling");
      expect(items.map((i) => i.value)).toContain("innovation");
    });

    it("should include weights from configuration", () => {
      const items = extractItemsets({ industry: "technology" });
      expect(items[0].weight).toBeGreaterThan(0);
      expect(items[0].weight).toBeLessThanOrEqual(1);
    });

    it("should handle empty responses", () => {
      const items = extractItemsets({});
      expect(items).toHaveLength(0);
    });

    it("should ignore null/undefined values", () => {
      const items = extractItemsets({
        industry: "technology",
        yearsExperience: undefined,
        leadershipLevel: "",
      });
      expect(items).toHaveLength(1);
    });

    it("should extract complete user profile correctly", () => {
      const items = extractItemsets(user1Responses);
      expect(items.length).toBeGreaterThan(10);

      // Check category distribution
      const categories = items.map((i) => i.category);
      expect(categories).toContain("professional");
      expect(categories).toContain("hobby");
      expect(categories).toContain("values");
    });
  });

  describe("calculateJaccardSimilarity", () => {
    it("should return 1 for identical itemsets", () => {
      const items = extractItemsets(user1Responses);
      const similarity = calculateJaccardSimilarity(items, items);
      expect(similarity).toBe(1);
    });

    it("should return 0 for completely different itemsets", () => {
      const items1 = extractItemsets({ industry: "technology" });
      const items2 = extractItemsets({ industry: "healthcare" });
      const similarity = calculateJaccardSimilarity(items1, items2);
      expect(similarity).toBe(0);
    });

    it("should return value between 0 and 1 for partial overlap", () => {
      const items1 = extractItemsets(user1Responses);
      const items2 = extractItemsets(user2SimilarResponses);
      const similarity = calculateJaccardSimilarity(items1, items2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it("should handle empty itemsets", () => {
      const items1 = extractItemsets({});
      const items2 = extractItemsets({ industry: "technology" });
      const similarity = calculateJaccardSimilarity(items1, items2);
      expect(similarity).toBe(0);
    });
  });

  describe("calculateWeightedSimilarity", () => {
    it("should return 1 for identical itemsets", () => {
      const items = extractItemsets(user1Responses);
      const similarity = calculateWeightedSimilarity(items, items);
      expect(similarity).toBe(1);
    });

    it("should weight high-priority attributes more", () => {
      // Industry has weight 0.9, organizationSize has weight 0.5
      const base = { industry: "technology" };
      const matchIndustry = { industry: "technology", organizationSize: "small" };
      const matchOrgSize = { industry: "healthcare", organizationSize: "small" };

      const items1 = extractItemsets({ ...base, organizationSize: "small" });
      const items2 = extractItemsets(matchIndustry);
      const items3 = extractItemsets(matchOrgSize);

      const simWithIndustry = calculateWeightedSimilarity(items1, items2);
      const simWithOrgSize = calculateWeightedSimilarity(items1, items3);

      // Matching industry should give higher similarity than matching org size
      expect(simWithIndustry).toBeGreaterThan(simWithOrgSize);
    });

    it("should handle similar users with high score", () => {
      const items1 = extractItemsets(user1Responses);
      const items2 = extractItemsets(user2SimilarResponses);
      const similarity = calculateWeightedSimilarity(items1, items2);
      expect(similarity).toBeGreaterThan(0.3);
    });

    it("should handle different users with low score", () => {
      const items1 = extractItemsets(user1Responses);
      const items3 = extractItemsets(user3DifferentResponses);
      const similarity = calculateWeightedSimilarity(items1, items3);
      expect(similarity).toBeLessThan(0.2);
    });
  });

  describe("findSharedAttributes", () => {
    it("should find all shared attributes between similar users", () => {
      const items1 = extractItemsets(user1Responses);
      const items2 = extractItemsets(user2SimilarResponses);
      const shared = findSharedAttributes(items1, items2);

      expect(shared.length).toBeGreaterThan(0);
      // Both have technology industry
      expect(shared.some((s) => s.description.includes("Technology"))).toBe(
        true
      );
    });

    it("should return empty array for completely different users", () => {
      const items1 = extractItemsets({ industry: "technology" });
      const items2 = extractItemsets({ industry: "healthcare" });
      const shared = findSharedAttributes(items1, items2);

      expect(shared).toHaveLength(0);
    });

    it("should sort commonalities by weight", () => {
      const items1 = extractItemsets(user1Responses);
      const items2 = extractItemsets(user2SimilarResponses);
      const shared = findSharedAttributes(items1, items2);

      for (let i = 1; i < shared.length; i++) {
        expect(shared[i - 1].weight).toBeGreaterThanOrEqual(shared[i].weight);
      }
    });

    it("should deduplicate similar descriptions", () => {
      const items1 = extractItemsets(user1Responses);
      const items2 = extractItemsets(user2SimilarResponses);
      const shared = findSharedAttributes(items1, items2);

      const descriptions = shared.map((s) => s.description.toLowerCase());
      const uniqueDescriptions = new Set(descriptions);
      expect(descriptions.length).toBe(uniqueDescriptions.size);
    });
  });

  describe("findComplementaryAttributes", () => {
    it("should find complementary industry pairs", () => {
      const items1 = extractItemsets({ industry: "technology" });
      const items2 = extractItemsets({ industry: "finance" });
      const complementary = findComplementaryAttributes(items1, items2);

      expect(complementary.length).toBeGreaterThan(0);
      expect(
        complementary.some((c) => c.description.includes("Complementary"))
      ).toBe(true);
    });

    it("should find cross-level leadership connections", () => {
      const items1 = extractItemsets({ leadershipLevel: "c-suite" });
      const items2 = extractItemsets({ leadershipLevel: "director" });
      const complementary = findComplementaryAttributes(items1, items2);

      expect(complementary.length).toBeGreaterThan(0);
    });

    it("should return empty for non-complementary pairs", () => {
      const items1 = extractItemsets({ industry: "technology" });
      const items2 = extractItemsets({ industry: "technology" });
      const complementary = findComplementaryAttributes(items1, items2);

      // Same industry is not complementary
      expect(
        complementary.filter((c) => c.description.includes("industries"))
      ).toHaveLength(0);
    });
  });

  describe("calculateMatchScore", () => {
    it("should return high score for similar users", () => {
      const score = calculateMatchScore(user1Responses, user2SimilarResponses);
      expect(score.totalScore).toBeGreaterThan(0.3);
      expect(score.affinityScore).toBeGreaterThan(0.3);
    });

    it("should return low score for different users", () => {
      const score = calculateMatchScore(user1Responses, user3DifferentResponses);
      expect(score.totalScore).toBeLessThan(0.3);
    });

    it("should include commonalities", () => {
      const score = calculateMatchScore(user1Responses, user2SimilarResponses);
      expect(score.commonalities.length).toBeGreaterThan(0);
      expect(score.commonalities.length).toBeLessThanOrEqual(5);
    });

    it("should calculate both affinity and strategic scores", () => {
      const score = calculateMatchScore(user1Responses, user2SimilarResponses);
      expect(score.affinityScore).toBeDefined();
      expect(score.strategicScore).toBeDefined();
      expect(score.affinityScore).toBeGreaterThanOrEqual(0);
      expect(score.strategicScore).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty responses", () => {
      const score = calculateMatchScore({}, user1Responses);
      expect(score.totalScore).toBe(0);
      expect(score.commonalities).toHaveLength(0);
    });
  });

  describe("determineMatchType", () => {
    it("should return high-affinity for similar users", () => {
      const score = calculateMatchScore(user1Responses, user2SimilarResponses);
      const type = determineMatchType(score);
      expect(type).toBe("high-affinity");
    });

    it("should return strategic when strategic score is dominant", () => {
      // Create a match score where strategic > affinity
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
  });

  describe("generateConversationStarters", () => {
    it("should generate starters based on commonalities", () => {
      const commonalities = [
        {
          category: "professional" as const,
          description: "Both work in Technology",
          weight: 0.9,
        },
        {
          category: "hobby" as const,
          description: "Both enjoy hiking",
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

      // Should be different approaches
      expect(highAffinityStarters[0]).not.toBe(strategicStarters[0]);
    });

    it("should provide fallback starters for empty commonalities", () => {
      const starters = generateConversationStarters([], "high-affinity");
      expect(starters.length).toBeGreaterThan(0);
    });
  });
});

describe("Integration: Full Matching Pipeline", () => {
  it("should produce valid matches between real user profiles", () => {
    const leader1: Partial<QuestionnaireData> = {
      industry: "technology",
      yearsExperience: "11-15",
      leadershipLevel: "vp",
      organizationSize: "large",
      leadershipPriorities: ["scaling", "innovation", "mentoring"],
      leadershipChallenges: ["talent", "change", "communication"],
      growthAreas: ["strategic", "teams", "presence"],
      networkingGoals: ["peers", "mentors"],
      rechargeActivities: ["reading", "hiking", "travel"],
      contentPreferences: ["business", "psychology", "science"],
      leadershipPhilosophy: ["servant", "coach", "people-first"],
      decisionMakingStyle: "collaborative",
      relationshipValues: ["trust", "authenticity", "mutual-benefit"],
      communicationStyle: "storytelling",
    };

    const leader2: Partial<QuestionnaireData> = {
      industry: "technology",
      yearsExperience: "6-10",
      leadershipLevel: "director",
      organizationSize: "mid-size",
      leadershipPriorities: ["culture", "mentoring", "innovation"],
      leadershipChallenges: ["talent", "priorities", "pipeline"],
      growthAreas: ["presence", "strategic", "storytelling"],
      networkingGoals: ["mentors", "peers"],
      rechargeActivities: ["reading", "yoga", "cooking"],
      contentPreferences: ["business", "psychology", "wellness"],
      leadershipPhilosophy: ["servant", "people-first", "collaborative"],
      decisionMakingStyle: "thoughtful",
      relationshipValues: ["trust", "expertise", "authenticity"],
      communicationStyle: "warm",
    };

    const score = calculateMatchScore(leader1, leader2);
    const matchType = determineMatchType(score);
    const starters = generateConversationStarters(score.commonalities, matchType);

    // Verify complete match output
    expect(score.totalScore).toBeGreaterThan(0.25); // Good match - above threshold
    expect(score.commonalities.length).toBeGreaterThanOrEqual(3);
    expect(matchType).toBe("high-affinity"); // Similar profiles
    expect(starters.length).toBeGreaterThan(0);

    // Verify commonalities make sense
    const descriptions = score.commonalities.map((c) => c.description);
    expect(descriptions.some((d) => d.includes("Technology"))).toBe(true);
  });

  it("should identify strategic matches for complementary profiles", () => {
    const techLeader: Partial<QuestionnaireData> = {
      industry: "technology",
      leadershipLevel: "vp",
      organizationSize: "startup",
      decisionMakingStyle: "decisive",
    };

    const financeLeader: Partial<QuestionnaireData> = {
      industry: "finance",
      leadershipLevel: "director",
      organizationSize: "enterprise",
      decisionMakingStyle: "collaborative",
    };

    const score = calculateMatchScore(techLeader, financeLeader);

    // Should find complementary attributes
    expect(score.strategicScore).toBeGreaterThan(0);
    expect(
      score.commonalities.some((c) => c.description.includes("Complementary"))
    ).toBe(true);
  });
});

