/** @vitest-environment node */

import { describe, it, expect } from "vitest";
import {
  profileUpdateSchema,
  meetingScheduleSchema,
  meetingRequestSchema,
  reportUserSchema,
  blockUserSchema,
  searchFiltersSchema,
  searchRequestSchema,
  calendarQuerySchema,
  computeMatchesSchema,
} from "./schemas";

describe("Extended Validation Schemas", () => {
  describe("profileUpdateSchema", () => {
    it("should accept valid profile update", () => {
      const result = profileUpdateSchema.safeParse({
        name: "Jane Doe",
        bio: "Leadership enthusiast",
        interests: ["technology", "hiking"],
        age: 35,
      });
      expect(result.success).toBe(true);
    });

    it("should reject name with invalid characters", () => {
      const result = profileUpdateSchema.safeParse({ name: "Jane123" });
      expect(result.success).toBe(false);
    });

    it("should accept name with hyphens and apostrophes", () => {
      const result = profileUpdateSchema.safeParse({ name: "Mary O'Brien-Smith" });
      expect(result.success).toBe(true);
    });

    it("should reject name under 2 characters", () => {
      const result = profileUpdateSchema.safeParse({ name: "A" });
      expect(result.success).toBe(false);
    });

    it("should reject name over 50 characters", () => {
      const result = profileUpdateSchema.safeParse({ name: "A".repeat(51) });
      expect(result.success).toBe(false);
    });

    it("should reject bio over 500 characters", () => {
      const result = profileUpdateSchema.safeParse({ name: "Jane", bio: "x".repeat(501) });
      expect(result.success).toBe(false);
    });

    it("should reject more than 10 interests", () => {
      const result = profileUpdateSchema.safeParse({
        name: "Jane",
        interests: Array.from({ length: 11 }, (_, i) => `interest-${i}`),
      });
      expect(result.success).toBe(false);
    });

    it("should reject age under 18", () => {
      const result = profileUpdateSchema.safeParse({ name: "Jane", age: 17 });
      expect(result.success).toBe(false);
    });

    it("should reject age over 120", () => {
      const result = profileUpdateSchema.safeParse({ name: "Jane", age: 121 });
      expect(result.success).toBe(false);
    });

    it("should accept nullable optional fields", () => {
      const result = profileUpdateSchema.safeParse({
        name: "Jane",
        bio: null,
        interests: null,
        location: null,
        age: null,
        position: null,
        title: null,
        company: null,
        photoUrl: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid photo URL", () => {
      const result = profileUpdateSchema.safeParse({ name: "Jane", photoUrl: "not-a-url" });
      expect(result.success).toBe(false);
    });

    it("should accept valid photo URL", () => {
      const result = profileUpdateSchema.safeParse({
        name: "Jane",
        photoUrl: "https://example.com/photo.jpg",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("meetingScheduleSchema", () => {
    const validData = {
      matchedUserId: "550e8400-e29b-41d4-a716-446655440000",
      platform: "google" as const,
      title: "Coffee Chat",
      startTime: "2026-02-15T14:00:00Z",
      durationMinutes: 30,
    };

    it("should accept valid meeting schedule", () => {
      const result = meetingScheduleSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID for matchedUserId", () => {
      const result = meetingScheduleSchema.safeParse({ ...validData, matchedUserId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid platform", () => {
      const result = meetingScheduleSchema.safeParse({ ...validData, platform: "zoom" });
      expect(result.success).toBe(false);
    });

    it("should reject duration under 15 minutes", () => {
      const result = meetingScheduleSchema.safeParse({ ...validData, durationMinutes: 10 });
      expect(result.success).toBe(false);
    });

    it("should reject duration over 240 minutes", () => {
      const result = meetingScheduleSchema.safeParse({ ...validData, durationMinutes: 300 });
      expect(result.success).toBe(false);
    });

    it("should default duration to 30 when not provided", () => {
      const { durationMinutes, ...withoutDuration } = validData;
      const result = meetingScheduleSchema.safeParse(withoutDuration);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.durationMinutes).toBe(30);
      }
    });

    it("should reject empty title", () => {
      const result = meetingScheduleSchema.safeParse({ ...validData, title: "" });
      expect(result.success).toBe(false);
    });

    it("should reject title over 200 characters", () => {
      const result = meetingScheduleSchema.safeParse({ ...validData, title: "x".repeat(201) });
      expect(result.success).toBe(false);
    });
  });

  describe("meetingRequestSchema", () => {
    const validData = {
      recipientId: "user-123",
      proposedTimes: ["2026-02-15T14:00:00Z"],
      duration: 30,
      meetingType: "video" as const,
    };

    it("should accept valid meeting request", () => {
      const result = meetingRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should require at least 1 proposed time", () => {
      const result = meetingRequestSchema.safeParse({ ...validData, proposedTimes: [] });
      expect(result.success).toBe(false);
    });

    it("should reject more than 3 proposed times", () => {
      const result = meetingRequestSchema.safeParse({
        ...validData,
        proposedTimes: [
          "2026-02-15T14:00:00Z",
          "2026-02-16T14:00:00Z",
          "2026-02-17T14:00:00Z",
          "2026-02-18T14:00:00Z",
        ],
      });
      expect(result.success).toBe(false);
    });

    it("should reject duration under 15 minutes", () => {
      const result = meetingRequestSchema.safeParse({ ...validData, duration: 10 });
      expect(result.success).toBe(false);
    });

    it("should reject duration over 120 minutes", () => {
      const result = meetingRequestSchema.safeParse({ ...validData, duration: 150 });
      expect(result.success).toBe(false);
    });

    it("should accept all valid meeting types", () => {
      for (const type of ["video", "coffee", "conference", "phone"]) {
        const result = meetingRequestSchema.safeParse({ ...validData, meetingType: type });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid meeting type", () => {
      const result = meetingRequestSchema.safeParse({ ...validData, meetingType: "lunch" });
      expect(result.success).toBe(false);
    });

    it("should accept optional contextMessage", () => {
      const result = meetingRequestSchema.safeParse({
        ...validData,
        contextMessage: "Looking forward to chatting!",
      });
      expect(result.success).toBe(true);
    });

    it("should reject contextMessage over 500 characters", () => {
      const result = meetingRequestSchema.safeParse({
        ...validData,
        contextMessage: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("reportUserSchema", () => {
    it("should accept valid report", () => {
      const result = reportUserSchema.safeParse({
        reportedUserId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "Inappropriate behavior",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = reportUserSchema.safeParse({
        reportedUserId: "not-a-uuid",
        reason: "Spam",
      });
      expect(result.success).toBe(false);
    });

    it("should reject reason over 50 characters", () => {
      const result = reportUserSchema.safeParse({
        reportedUserId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "x".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("should accept optional description", () => {
      const result = reportUserSchema.safeParse({
        reportedUserId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "Spam",
        description: "Sending unsolicited messages",
      });
      expect(result.success).toBe(true);
    });

    it("should reject description over 500 characters", () => {
      const result = reportUserSchema.safeParse({
        reportedUserId: "550e8400-e29b-41d4-a716-446655440000",
        reason: "Spam",
        description: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("blockUserSchema", () => {
    it("should accept valid UUID", () => {
      const result = blockUserSchema.safeParse({
        blockedUserId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-UUID string", () => {
      const result = blockUserSchema.safeParse({ blockedUserId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });
  });

  describe("searchFiltersSchema", () => {
    it("should accept valid filter combinations", () => {
      const result = searchFiltersSchema.safeParse({
        industries: ["technology", "healthcare"],
        leadershipLevels: ["senior-director"],
        keywords: "innovation",
      });
      expect(result.success).toBe(true);
    });

    it("should reject keywords over 200 characters", () => {
      const result = searchFiltersSchema.safeParse({ keywords: "x".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("should accept empty object", () => {
      const result = searchFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("searchRequestSchema", () => {
    it("should accept valid search request", () => {
      const result = searchRequestSchema.safeParse({
        query: "innovation leaders",
        page: 1,
        pageSize: 20,
      });
      expect(result.success).toBe(true);
    });

    it("should default page to 1", () => {
      const result = searchRequestSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it("should default pageSize to 20", () => {
      const result = searchRequestSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pageSize).toBe(20);
      }
    });

    it("should reject pageSize over 50", () => {
      const result = searchRequestSchema.safeParse({ pageSize: 51 });
      expect(result.success).toBe(false);
    });

    it("should accept valid sortOrder values", () => {
      for (const sort of ["relevance", "match-percentage", "name", "leadership-level"]) {
        const result = searchRequestSchema.safeParse({ sortOrder: sort });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("calendarQuerySchema", () => {
    const validData = {
      mode: "events" as const,
      timeMin: "2026-02-01T00:00:00Z",
      timeMax: "2026-02-28T23:59:59Z",
    };

    it("should accept valid calendar query", () => {
      const result = calendarQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject invalid mode", () => {
      const result = calendarQuerySchema.safeParse({ ...validData, mode: "invalid" });
      expect(result.success).toBe(false);
    });

    it("should accept both events and availability modes", () => {
      expect(calendarQuerySchema.safeParse({ ...validData, mode: "events" }).success).toBe(true);
      expect(calendarQuerySchema.safeParse({ ...validData, mode: "availability" }).success).toBe(true);
    });

    it("should accept optional platform", () => {
      const result = calendarQuerySchema.safeParse({ ...validData, platform: "google" });
      expect(result.success).toBe(true);
    });

    it("should accept optional targetUserId", () => {
      const result = calendarQuerySchema.safeParse({ ...validData, targetUserId: "user-123" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid datetime format for timeMin", () => {
      const result = calendarQuerySchema.safeParse({ ...validData, timeMin: "not-a-date" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid datetime format for timeMax", () => {
      const result = calendarQuerySchema.safeParse({ ...validData, timeMax: "2026-13-01" });
      expect(result.success).toBe(false);
    });
  });

  describe("computeMatchesSchema", () => {
    it("should accept valid UUID userId", () => {
      const result = computeMatchesSchema.safeParse({
        userId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = computeMatchesSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept forAllUsers boolean", () => {
      const result = computeMatchesSchema.safeParse({ forAllUsers: true });
      expect(result.success).toBe(true);
    });
  });
});
