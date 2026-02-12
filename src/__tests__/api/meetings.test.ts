/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { meetings, users } from "@/lib/stores";

// Mock Supabase
vi.mock("@/lib/supabase/client", () => ({
  supabaseAdmin: null,
  isSupabaseConfigured: false,
}));

// Mock Socket.io
vi.mock("@/lib/socket", () => ({
  getSocketInstance: () => null,
}));

// Mock next/headers cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === "device_id") return { value: "test-device" };
      return undefined;
    }),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Mock getSession
const mockSession = { userId: "user-1", email: "test@test.com", expiresAt: new Date(Date.now() + 3600000) };
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

// Mock notification service
vi.mock("@/lib/notifications/notification-service", () => ({
  notifyMeetingRequest: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { resetRateLimit } from "@/lib/security/rateLimit";
import { GET, POST } from "@/app/api/meetings/route";

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/meetings");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url, { method: "GET" });
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/meetings", {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
}

describe("Meetings API Routes", () => {
  beforeEach(() => {
    meetings.clear();
    users.clear();
    vi.mocked(getSession).mockResolvedValue(null);
    resetRateLimit("user-1", "schedule-meeting");
    resetRateLimit("test-device", "schedule-meeting");
  });

  describe("GET /api/meetings", () => {
    it("should return 401 when not authenticated and no device_id", async () => {
      // Override the cookies mock for this test to return no device_id
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockReturnValueOnce({
        get: vi.fn(() => undefined),
        set: vi.fn(),
        delete: vi.fn(),
      } as never);

      const req = createGetRequest();
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should return empty meetings for new user", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createGetRequest();
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.meetings).toEqual([]);
      expect(body.data.stats).toBeDefined();
    });

    it("should return meetings for authenticated user", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);

      // Create users in the store for user lookup
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
      users.set("recipient@test.com", {
        id: "user-2",
        email: "recipient@test.com",
        passwordHash: "hash",
        name: "Recipient",
        position: "Engineer",
        title: "Staff Engineer",
        questionnaireCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      meetings.set("mtg-1", {
        id: "mtg-1",
        requesterId: "user-1",
        recipientId: "user-2",
        status: "pending",
        duration: 30,
        meetingType: "video",
        proposedTimes: [new Date("2026-05-01T10:00:00Z")],
        remindersSent: { day_before: false, hour_before: false },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();
      expect(body.data.meetings).toHaveLength(1);
      expect(body.data.stats.pending).toBe(1);
    });

    it("should include stats in response", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createGetRequest();
      const res = await GET(req);
      const body = await res.json();
      expect(body.data.stats).toHaveProperty("pending");
      expect(body.data.stats).toHaveProperty("upcoming");
      expect(body.data.stats).toHaveProperty("completed");
    });
  });

  describe("POST /api/meetings", () => {
    it("should return 401 when not authenticated", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockReturnValueOnce({
        get: vi.fn(() => undefined),
        set: vi.fn(),
        delete: vi.fn(),
      } as never);

      const req = createPostRequest({
        recipientId: "user-2",
        duration: 30,
        meetingType: "video",
        proposedTimes: ["2026-05-01T10:00:00Z"],
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 for missing required fields", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createPostRequest({ recipientId: "user-2" });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Missing required fields");
    });

    it("should return 400 when scheduling with yourself", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createPostRequest({
        recipientId: "user-1",
        duration: 30,
        meetingType: "video",
        proposedTimes: ["2026-05-01T10:00:00Z"],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("yourself");
    });

    it("should return 400 for duplicate pending meeting", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      meetings.set("existing-mtg", {
        id: "existing-mtg",
        requesterId: "user-1",
        recipientId: "user-2",
        status: "pending",
        duration: 30,
        meetingType: "video",
        proposedTimes: [new Date()],
        remindersSent: { day_before: false, hour_before: false },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = createPostRequest({
        recipientId: "user-2",
        duration: 30,
        meetingType: "video",
        proposedTimes: ["2026-05-01T10:00:00Z"],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("pending meeting request");
    });

    it("should create meeting successfully", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      const req = createPostRequest({
        recipientId: "user-2",
        duration: 30,
        meetingType: "coffee",
        contextMessage: "Would love to chat!",
        proposedTimes: ["2026-05-01T10:00:00Z", "2026-05-01T14:00:00Z"],
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.meeting.status).toBe("pending");
      expect(body.data.meeting.duration).toBe(30);
      expect(body.data.meeting.meetingType).toBe("coffee");
    });

    it("should return 429 when rate limited", async () => {
      vi.mocked(getSession).mockResolvedValue(mockSession);
      // Exhaust rate limit (20 per hour for schedule-meeting)
      for (let i = 0; i < 20; i++) {
        const req = createPostRequest({
          recipientId: `user-${i + 100}`,
          duration: 30,
          meetingType: "video",
          proposedTimes: ["2026-05-01T10:00:00Z"],
        });
        await POST(req);
      }

      const req = createPostRequest({
        recipientId: "user-999",
        duration: 30,
        meetingType: "video",
        proposedTimes: ["2026-05-01T10:00:00Z"],
      });
      const res = await POST(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toContain("too many");
    });
  });
});
