/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures this runs before the hoisted vi.mock call
const mockProvider = vi.hoisted(() => ({
  name: "mock-provider",
  isConfigured: true,
  dimensions: 768,
  generateEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
  generateBatchEmbeddings: vi.fn().mockResolvedValue([
    new Array(768).fill(0.1),
    new Array(768).fill(0.2),
  ]),
}));

// Return the same mockProvider instance every time
vi.mock("./provider-factory", () => ({
  getEmbeddingProvider: () => mockProvider,
}));

import { cosineSimilarity, createProfileText, generateEmbedding, generateBatchEmbeddings } from "./embeddings";

describe("Embeddings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical vectors", () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it("should return 0 for orthogonal vectors", () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0, 5);
    });

    it("should return -1 for opposite vectors", () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1, 5);
    });

    it("should return 0 for zero vectors", () => {
      const zero = [0, 0, 0];
      const vec = [1, 2, 3];
      expect(cosineSimilarity(zero, vec)).toBe(0);
    });

    it("should throw for different-length vectors", () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow("same length");
    });

    it("should calculate correct similarity for known vectors", () => {
      const result = cosineSimilarity([1, 0], [1, 1]);
      expect(result).toBeCloseTo(0.7071, 3);
    });

    it("should handle single-element vectors", () => {
      expect(cosineSimilarity([3], [3])).toBeCloseTo(1, 5);
      expect(cosineSimilarity([3], [-3])).toBeCloseTo(-1, 5);
    });
  });

  describe("createProfileText", () => {
    it("should include name, title, company", () => {
      const text = createProfileText({
        name: "Jane Doe",
        title: "Chief Technology Officer",
        company: "Acme Corp",
      });
      expect(text).toContain("Name: Jane Doe");
      expect(text).toContain("Title: Chief Technology Officer");
      expect(text).toContain("Company: Acme Corp");
    });

    it("should include bio", () => {
      const text = createProfileText({ bio: "Passionate leader" });
      expect(text).toContain("Bio: Passionate leader");
    });

    it("should include interests as comma-separated list", () => {
      const text = createProfileText({ interests: ["hiking", "reading", "cooking"] });
      expect(text).toContain("Interests: hiking, reading, cooking");
    });

    it("should include questionnaire role and archetype", () => {
      const text = createProfileText({
        questionnaireData: {
          roleSummary: "I ship AI products",
          archetype: "builder",
          teamQualities: ["energy", "ideas"],
        },
      });
      expect(text).toContain("Role: I ship AI products");
      expect(text).toContain("Archetype: builder");
      expect(text).toContain("Team qualities: energy, ideas");
    });

    it("should include questionnaire growth and talk topic", () => {
      const text = createProfileText({
        questionnaireData: {
          growthArea: "strategic thinking",
          talkTopic: "distributed systems",
          refinedInterest: "leading ML teams",
        },
      });
      expect(text).toContain("Learning: strategic thinking");
      expect(text).toContain("Talk topic: distributed systems");
      expect(text).toContain("Focus: leading ML teams");
    });

    it("should include personal interests from questionnaire", () => {
      const text = createProfileText({
        questionnaireData: {
          personalInterest: "hiking and reading",
          personalityTags: ["early-bird", "planner"],
          funFact: "I once baked 100 croissants",
        },
      });
      expect(text).toContain("Outside work: hiking and reading");
      expect(text).toContain("Style: early-bird, planner");
      expect(text).toContain("Fun fact: I once baked 100 croissants");
    });

    it("should handle empty/missing fields gracefully", () => {
      const text = createProfileText({});
      expect(text).toBe("");
    });

    it("should separate parts with newlines", () => {
      const text = createProfileText({ name: "Jane", bio: "Leader" });
      expect(text).toBe("Name: Jane\nBio: Leader");
    });
  });

  describe("generateEmbedding", () => {
    it("should call provider.generateEmbedding and return result", async () => {
      const result = await generateEmbedding("test text");
      expect(result).toHaveLength(768);
      expect(mockProvider.generateEmbedding).toHaveBeenCalledWith("test text");
    });
  });

  describe("generateBatchEmbeddings", () => {
    it("should call provider.generateBatchEmbeddings and return results", async () => {
      const result = await generateBatchEmbeddings(["text1", "text2"]);
      expect(result).toHaveLength(2);
      expect(mockProvider.generateBatchEmbeddings).toHaveBeenCalledWith(["text1", "text2"]);
    });
  });
});
