/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { users, questionnaireResponses, userMatches } from "@/lib/stores";

// Mock Supabase
vi.mock("@/lib/supabase/client", () => ({
  supabaseAdmin: null,
  isSupabaseConfigured: false,
}));

// Mock AI generative (conversation starters)
vi.mock("@/lib/ai/generative", () => ({
  generateConversationStartersAI: vi.fn().mockResolvedValue(null),
}));

// Mock getSession
const mockSession = { userId: "user-1", email: "test@test.com", expiresAt: new Date(Date.now() + 3600000) };
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

import { getSession } from "@/lib/auth";
import { GET, POST } from "@/app/api/matches/route";

function createGetRequest(params?: Record<string, string>, cookies?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/matches");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const headers = new Headers();
  if (cookies) {
    headers.set("cookie", Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; "));
  }
  return new NextRequest(url, { method: "GET", headers });
}

/** Helper to set up a user with questionnaire data (no other candidates → demo matches) */
function setupUserForDemoMatches() {
  users.set("test@test.com", {
    id: "user-1",
    email: "test@test.com",
    passwordHash: "hash",
    name: "Test User",
    position: "Manager",
    title: "Director",
    questionnaireCompleted: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  questionnaireResponses.set("user-1", {
    userId: "user-1",
    responses: { industry: "technology", leadershipLevel: "director" },
    completedAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("Matches API Routes", () => {
  beforeEach(() => {
    users.clear();
    questionnaireResponses.clear();
    userMatches.clear();
    vi.mocked(getSession).mockResolvedValue(null);
  });

  describe("GET /api/matches", () => {
    it("should return empty matches for anonymous user with no store data", async () => {
      // Anonymous user (device_id only) won't have an entry in the users store,
      // so generateMatchesForUser returns [] (no user found)
      const req = createGetRequest({}, { device_id: "test-device" });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.matches).toBeDefined();
      expect(body.data.metrics).toBeDefined();
    });

    it("should return demo matches when user exists with questionnaire but no candidates", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      setupUserForDemoMatches();

      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();
      expect(body.success).toBe(true);
      // User has questionnaire data but no other candidates → demo matches
      expect(body.data.matches.length).toBeGreaterThan(0);
      expect(body.data.matches[0]).toHaveProperty("matchedUser");
      expect(body.data.matches[0]).toHaveProperty("conversationStarters");
    });

    it("should return empty when user exists but has no questionnaire responses", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      users.set("test@test.com", {
        id: "user-1",
        email: "test@test.com",
        passwordHash: "hash",
        name: "Test User",
        position: "Manager",
        title: "Director",
        questionnaireCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();
      expect(body.success).toBe(true);
      // No questionnaire responses → generateMatchesForUser returns []
      expect(body.data.matches).toHaveLength(0);
    });

    it("should return cached matches on second call", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      // Pre-populate cached matches
      const cachedMatches = [{
        id: "cached-1",
        userId: "user-1",
        matchedUserId: "cached-match",
        matchedUser: {
          id: "cached-match",
          profile: { name: "Cached Match", position: "CEO", title: "CEO" },
          questionnaireCompleted: true,
        },
        type: "high-affinity" as const,
        commonalities: [{ category: "professional" as const, description: "Both in tech", weight: 0.9 }],
        conversationStarters: ["Hello!"],
        score: 0.85,
        generatedAt: new Date(),
        viewed: false,
        passed: false,
      }];
      userMatches.set("user-1", cachedMatches);

      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();
      expect(body.data.matches).toHaveLength(1);
      expect(body.data.matches[0].id).toBe("cached-1");
    });

    it("should force regenerate when refresh=true", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      setupUserForDemoMatches();

      // Pre-populate cached matches
      userMatches.set("user-1", [{
        id: "old-match",
        userId: "user-1",
        matchedUserId: "old-user",
        matchedUser: {
          id: "old-user",
          profile: { name: "Old Match", position: "CTO", title: "CTO" },
          questionnaireCompleted: true,
        },
        type: "strategic" as const,
        commonalities: [],
        conversationStarters: [],
        score: 0.5,
        generatedAt: new Date(),
        viewed: false,
        passed: false,
      }]);

      const req = createGetRequest({ refresh: "true" });
      const res = await GET(req);
      const body = await res.json();
      expect(body.success).toBe(true);
      // With refresh=true, regenerates → demo matches (user in store, no candidates)
      expect(body.data.matches.length).toBeGreaterThan(0);
      // Should not contain the old cached match
      expect(body.data.matches.find((m: { id: string }) => m.id === "old-match")).toBeUndefined();
    });

    it("should filter out passed matches", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      userMatches.set("user-1", [
        {
          id: "match-active",
          userId: "user-1",
          matchedUserId: "u2",
          matchedUser: { id: "u2", profile: { name: "Active", position: "VP", title: "VP" }, questionnaireCompleted: true },
          type: "high-affinity" as const,
          commonalities: [],
          conversationStarters: [],
          score: 0.9,
          generatedAt: new Date(),
          viewed: false,
          passed: false,
        },
        {
          id: "match-passed",
          userId: "user-1",
          matchedUserId: "u3",
          matchedUser: { id: "u3", profile: { name: "Passed", position: "CTO", title: "CTO" }, questionnaireCompleted: true },
          type: "strategic" as const,
          commonalities: [],
          conversationStarters: [],
          score: 0.7,
          generatedAt: new Date(),
          viewed: false,
          passed: true,
        },
      ]);

      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();
      expect(body.data.matches).toHaveLength(1);
      expect(body.data.matches[0].id).toBe("match-active");
    });

    it("should include metrics with correct shape in response", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      setupUserForDemoMatches();

      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();
      expect(body.data.metrics).toBeDefined();
      expect(body.data.metrics).toHaveProperty("averageScore");
      expect(body.data.metrics).toHaveProperty("highAffinityCount");
      expect(body.data.metrics).toHaveProperty("strategicCount");
      expect(body.data.metrics).toHaveProperty("categoryDistribution");
    });
  });

  describe("POST /api/matches", () => {
    it("should return 401 when not authenticated", async () => {
      const res = await POST();
      expect(res.status).toBe(401);
    });

    it("should regenerate matches for authenticated user", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const res = await POST();
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.matches).toBeDefined();
      expect(body.data.metrics).toBeDefined();
      expect(body.data.message).toContain("refreshed");
    });
  });
});
