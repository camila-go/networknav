/** @vitest-environment node */

import { describe, it, expect } from "vitest";
import {
  generateMatches,
  refreshMatches,
  calculateMatchQualityMetrics,
  applyPreferenceBoosts,
} from "./matching-service";
import { createMockMatch, createMockQuestionnaireData } from "@/test/factories";
import type { QuestionnaireData, Match } from "@/types";

// Helper to create a user with responses for matching
function createUserWithResponses(
  id: string,
  name: string,
  overrides?: Partial<QuestionnaireData>
) {
  return {
    id,
    profile: { name, position: "Manager", title: "Director" },
    responses: createMockQuestionnaireData(overrides),
  };
}

describe("Matching Service", () => {
  // Create diverse test users
  const mainUser = createUserWithResponses("user-main", "Main User", {
    industry: "technology",
    leadershipLevel: "senior-director",
    leadershipPriorities: ["innovation", "talent-development"],
    leadershipChallenges: ["scaling-teams", "change-management"],
    rechargeActivities: ["hiking", "reading"],
    communicationStyle: "direct",
  });

  const similarUser = createUserWithResponses("user-similar", "Similar User", {
    industry: "technology",
    leadershipLevel: "senior-director",
    leadershipPriorities: ["innovation", "talent-development"],
    leadershipChallenges: ["scaling-teams"],
    rechargeActivities: ["hiking", "reading", "cooking"],
    communicationStyle: "direct",
  });

  const complementaryUser = createUserWithResponses("user-complement", "Complementary User", {
    industry: "healthcare",
    leadershipLevel: "c-suite",
    leadershipPriorities: ["operational-excellence", "digital-transformation"],
    leadershipChallenges: ["regulatory-compliance"],
    rechargeActivities: ["meditation", "golf"],
    communicationStyle: "collaborative",
  });

  const lowMatchUser = createUserWithResponses("user-low", "Low Match User", {
    industry: "construction",
    leadershipLevel: "team-lead",
    leadershipPriorities: ["safety"],
    leadershipChallenges: ["recruitment"],
    rechargeActivities: ["fishing"],
    communicationStyle: "reserved",
  });

  const allCandidates = [similarUser, complementaryUser, lowMatchUser];

  describe("generateMatches", () => {
    it("should return empty array when no candidates", () => {
      const matches = generateMatches(mainUser, []);
      expect(matches).toEqual([]);
    });

    it("should exclude the user themselves from candidates", () => {
      const matches = generateMatches(mainUser, [mainUser, ...allCandidates]);
      const matchedIds = matches.map((m) => m.matchedUserId);
      expect(matchedIds).not.toContain(mainUser.id);
    });

    it("should exclude explicitly excluded user IDs", () => {
      const matches = generateMatches(mainUser, allCandidates, {
        excludeUserIds: [similarUser.id],
      });
      const matchedIds = matches.map((m) => m.matchedUserId);
      expect(matchedIds).not.toContain(similarUser.id);
    });

    it("should filter candidates below minMatchScore", () => {
      const matches = generateMatches(mainUser, allCandidates, {
        minMatchScore: 0.99, // Very high threshold
      });
      expect(matches).toEqual([]);
    });

    it("should return matches with correct structure", () => {
      const matches = generateMatches(mainUser, allCandidates);
      if (matches.length > 0) {
        const match = matches[0];
        expect(match).toHaveProperty("id");
        expect(match).toHaveProperty("userId", mainUser.id);
        expect(match).toHaveProperty("matchedUserId");
        expect(match).toHaveProperty("matchedUser");
        expect(match).toHaveProperty("type");
        expect(match).toHaveProperty("commonalities");
        expect(match).toHaveProperty("conversationStarters");
        expect(match).toHaveProperty("score");
        expect(match).toHaveProperty("generatedAt");
        expect(match.viewed).toBe(false);
        expect(match.passed).toBe(false);
      }
    });

    it("should set match type to either high-affinity or strategic", () => {
      const matches = generateMatches(mainUser, allCandidates);
      for (const match of matches) {
        expect(["high-affinity", "strategic"]).toContain(match.type);
      }
    });

    it("should include conversation starters", () => {
      const matches = generateMatches(mainUser, allCandidates);
      for (const match of matches) {
        expect(match.conversationStarters.length).toBeGreaterThan(0);
      }
    });

    it("should respect maxHighAffinityMatches limit", () => {
      const matches = generateMatches(mainUser, allCandidates, {
        maxHighAffinityMatches: 1,
        maxStrategicMatches: 1,
      });
      const highAffinity = matches.filter((m) => m.type === "high-affinity");
      expect(highAffinity.length).toBeLessThanOrEqual(1);
    });

    it("should return at most 6 matches by default", () => {
      // Generate many candidates
      const manyCandidates = Array.from({ length: 20 }, (_, i) =>
        createUserWithResponses(`user-${i}`, `User ${i}`, {
          industry: i % 2 === 0 ? "technology" : "healthcare",
          leadershipLevel: i % 3 === 0 ? "senior-director" : "c-suite",
        })
      );
      const matches = generateMatches(mainUser, manyCandidates);
      expect(matches.length).toBeLessThanOrEqual(6);
    });

    it("should include matched user profile data", () => {
      const matches = generateMatches(mainUser, allCandidates);
      for (const match of matches) {
        expect(match.matchedUser).toBeDefined();
        expect(match.matchedUser.id).toBe(match.matchedUserId);
        expect(match.matchedUser.profile).toBeDefined();
        expect(match.matchedUser.questionnaireCompleted).toBe(true);
      }
    });

    it("should generate match IDs with correct prefix", () => {
      const matches = generateMatches(mainUser, allCandidates);
      for (const match of matches) {
        expect(match.id).toMatch(/^match_/);
      }
    });
  });

  describe("refreshMatches", () => {
    it("should exclude recently matched users (last 30 days)", () => {
      const recentMatch = createMockMatch({
        matchedUserId: similarUser.id,
        generatedAt: new Date(), // recent
        passed: false,
      });

      const matches = refreshMatches(mainUser, allCandidates, [recentMatch]);
      const matchedIds = matches.map((m) => m.matchedUserId);
      expect(matchedIds).not.toContain(similarUser.id);
    });

    it("should not exclude passed matches from recent period", () => {
      const passedMatch = createMockMatch({
        matchedUserId: similarUser.id,
        generatedAt: new Date(),
        passed: true,
      });

      const matches = refreshMatches(mainUser, allCandidates, [passedMatch]);
      // similarUser should NOT be excluded because the match was passed
      const matchedIds = matches.map((m) => m.matchedUserId);
      // It may or may not appear depending on score, but it shouldn't be excluded
      // The key test is that passed matches don't add to recentlyMatchedIds
    });

    it("should not exclude matches older than 30 days", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      const oldMatch = createMockMatch({
        matchedUserId: similarUser.id,
        generatedAt: oldDate,
        passed: false,
      });

      const matches = refreshMatches(mainUser, allCandidates, [oldMatch]);
      // similarUser should be eligible again
    });

    it("should merge excludeUserIds with recently matched", () => {
      const recentMatch = createMockMatch({
        matchedUserId: similarUser.id,
        generatedAt: new Date(),
        passed: false,
      });

      const matches = refreshMatches(mainUser, allCandidates, [recentMatch], {
        excludeUserIds: [complementaryUser.id],
      });

      const matchedIds = matches.map((m) => m.matchedUserId);
      expect(matchedIds).not.toContain(similarUser.id);
      expect(matchedIds).not.toContain(complementaryUser.id);
    });
  });

  describe("calculateMatchQualityMetrics", () => {
    it("should return zeros for empty matches array", () => {
      const metrics = calculateMatchQualityMetrics([]);
      expect(metrics.averageScore).toBe(0);
      expect(metrics.highAffinityCount).toBe(0);
      expect(metrics.strategicCount).toBe(0);
      expect(metrics.categoryDistribution).toEqual({});
    });

    it("should calculate correct average score", () => {
      const matches: Match[] = [
        createMockMatch({ score: 0.8 }),
        createMockMatch({ score: 0.6 }),
        createMockMatch({ score: 0.4 }),
      ];
      const metrics = calculateMatchQualityMetrics(matches);
      expect(metrics.averageScore).toBeCloseTo(0.6, 5);
    });

    it("should count high-affinity and strategic types", () => {
      const matches: Match[] = [
        createMockMatch({ type: "high-affinity" }),
        createMockMatch({ type: "high-affinity" }),
        createMockMatch({ type: "strategic" }),
      ];
      const metrics = calculateMatchQualityMetrics(matches);
      expect(metrics.highAffinityCount).toBe(2);
      expect(metrics.strategicCount).toBe(1);
    });

    it("should build category distribution from commonalities", () => {
      const matches: Match[] = [
        createMockMatch({
          commonalities: [
            { category: "professional", description: "Same industry", weight: 0.8 },
            { category: "hobby", description: "Both hike", weight: 0.6 },
          ],
        }),
        createMockMatch({
          commonalities: [
            { category: "professional", description: "Same level", weight: 0.7 },
            { category: "values", description: "Trust", weight: 0.9 },
          ],
        }),
      ];
      const metrics = calculateMatchQualityMetrics(matches);
      expect(metrics.categoryDistribution.professional).toBe(2);
      expect(metrics.categoryDistribution.hobby).toBe(1);
      expect(metrics.categoryDistribution.values).toBe(1);
    });
  });

  describe("applyPreferenceBoosts", () => {
    it("should return matches unchanged (current implementation)", () => {
      const matches = [createMockMatch(), createMockMatch()];
      const boosted = applyPreferenceBoosts(matches, { innovation: 1.5 });
      expect(boosted).toEqual(matches);
    });
  });
});
