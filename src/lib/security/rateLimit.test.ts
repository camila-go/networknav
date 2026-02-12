/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  withRateLimit,
  RATE_LIMITS,
} from "./rateLimit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    // Reset all rate limits between tests using unique user IDs
    // to prevent cross-test pollution
  });

  describe("RATE_LIMITS config", () => {
    it("should have login limit of 5 per 15 minutes", () => {
      expect(RATE_LIMITS.login.maxRequests).toBe(5);
      expect(RATE_LIMITS.login.windowMs).toBe(15 * 60 * 1000);
    });

    it("should have register limit of 3 per hour", () => {
      expect(RATE_LIMITS.register.maxRequests).toBe(3);
      expect(RATE_LIMITS.register.windowMs).toBe(60 * 60 * 1000);
    });

    it("should have send-message limit of 50 per hour", () => {
      expect(RATE_LIMITS["send-message"].maxRequests).toBe(50);
      expect(RATE_LIMITS["send-message"].windowMs).toBe(60 * 60 * 1000);
    });

    it("should have schedule-meeting limit of 20 per hour", () => {
      expect(RATE_LIMITS["schedule-meeting"].maxRequests).toBe(20);
    });

    it("should have api-default fallback of 60 per minute", () => {
      expect(RATE_LIMITS["api-default"].maxRequests).toBe(60);
      expect(RATE_LIMITS["api-default"].windowMs).toBe(60 * 1000);
    });

    it("should have report-user limit of 5 per day", () => {
      expect(RATE_LIMITS["report-user"].maxRequests).toBe(5);
      expect(RATE_LIMITS["report-user"].windowMs).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow first request for new user/action", async () => {
      const userId = crypto.randomUUID();
      const result = await checkRateLimit(userId, "login");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 5 - 1
    });

    it("should decrement remaining with each request", async () => {
      const userId = crypto.randomUUID();
      await checkRateLimit(userId, "login");
      const result = await checkRateLimit(userId, "login");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3); // 5 - 2
    });

    it("should block after max requests reached", async () => {
      const userId = crypto.randomUUID();
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, "login");
      }
      const result = await checkRateLimit(userId, "login");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should return resetTime when blocked", async () => {
      const userId = crypto.randomUUID();
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, "login");
      }
      const result = await checkRateLimit(userId, "login");
      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeDefined();
      expect(result.resetTime!).toBeGreaterThan(Date.now());
    });

    it("should use custom maxRequests when provided", async () => {
      const userId = crypto.randomUUID();
      for (let i = 0; i < 2; i++) {
        await checkRateLimit(userId, "login", 2);
      }
      const result = await checkRateLimit(userId, "login", 2);
      expect(result.allowed).toBe(false);
    });

    it("should fall back to api-default for unknown actions", async () => {
      const userId = crypto.randomUUID();
      const result = await checkRateLimit(userId, "unknown-action");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1 (api-default)
    });

    it("should track different users independently", async () => {
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(user1, "login");
      }
      const result = await checkRateLimit(user2, "login");
      expect(result.allowed).toBe(true);
    });

    it("should track different actions independently", async () => {
      const userId = crypto.randomUUID();
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, "login");
      }
      const result = await checkRateLimit(userId, "register");
      expect(result.allowed).toBe(true);
    });
  });

  describe("resetRateLimit", () => {
    it("should clear rate limit record for user/action", async () => {
      const userId = crypto.randomUUID();
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, "login");
      }
      resetRateLimit(userId, "login");
      const result = await checkRateLimit(userId, "login");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should not affect other users/actions", async () => {
      const userId = crypto.randomUUID();
      await checkRateLimit(userId, "login");
      await checkRateLimit(userId, "register");
      resetRateLimit(userId, "login");
      const status = getRateLimitStatus(userId, "register");
      expect(status.count).toBe(1);
    });
  });

  describe("getRateLimitStatus", () => {
    it("should return count and remaining without incrementing", async () => {
      const userId = crypto.randomUUID();
      await checkRateLimit(userId, "login");
      await checkRateLimit(userId, "login");
      const status = getRateLimitStatus(userId, "login");
      expect(status.count).toBe(2);
      expect(status.remaining).toBe(3);
      // Call again to verify it didn't increment
      const status2 = getRateLimitStatus(userId, "login");
      expect(status2.count).toBe(2);
    });

    it("should return zero count for fresh user", () => {
      const userId = crypto.randomUUID();
      const status = getRateLimitStatus(userId, "login");
      expect(status.count).toBe(0);
      expect(status.remaining).toBe(5);
    });
  });

  describe("withRateLimit", () => {
    it("should execute handler when under limit", async () => {
      const userId = crypto.randomUUID();
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );
      const response = await withRateLimit(userId, "login", handler);
      expect(handler).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
    });

    it("should return 429 with Retry-After when blocked", async () => {
      const userId = crypto.randomUUID();
      for (let i = 0; i < 5; i++) {
        await checkRateLimit(userId, "login");
      }
      const handler = vi.fn();
      const response = await withRateLimit(userId, "login", handler);
      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBeDefined();
      const body = await response.json();
      expect(body.error).toContain("Too many requests");
    });

    it("should add X-RateLimit-Remaining header to successful response", async () => {
      const userId = crypto.randomUUID();
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );
      const response = await withRateLimit(userId, "login", handler);
      expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
      expect(Number(response.headers.get("X-RateLimit-Remaining"))).toBe(4);
    });
  });
});
