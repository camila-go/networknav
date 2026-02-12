/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { users } from "@/lib/stores";
import { hashPassword } from "@/lib/auth";
import { resetRateLimit } from "@/lib/security/rateLimit";

// Mock Supabase to prevent external calls
vi.mock("@/lib/supabase/client", () => ({
  supabaseAdmin: null,
  isSupabaseConfigured: false,
}));

// Import route handlers
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";

function createRequest(body: unknown, headers?: Record<string, string>): NextRequest {
  const reqHeaders = new Headers(headers || {});
  reqHeaders.set("content-type", "application/json");
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: reqHeaders,
    body: JSON.stringify(body),
  });
}

describe("Auth API Routes", () => {
  beforeEach(async () => {
    users.clear();
    // Reset rate limits with unique prefixes used by routes
    resetRateLimit("login:unknown", "login");
    resetRateLimit("register:unknown", "register");
  });

  describe("POST /api/auth/login", () => {
    it("should return 400 for invalid input", async () => {
      const req = createRequest({ email: "", password: "" });
      const res = await loginHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("Validation");
    });

    it("should return 401 for non-existent user", async () => {
      const req = createRequest({ email: "nobody@test.com", password: "Password1" });
      const res = await loginHandler(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it("should return 401 for wrong password", async () => {
      const passwordHash = await hashPassword("CorrectPass1");
      users.set("test@test.com", {
        id: "user-1",
        email: "test@test.com",
        passwordHash,
        name: "Test User",
        position: "Manager",
        title: "Director",
        company: "TestCorp",
        questionnaireCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = createRequest({ email: "test@test.com", password: "WrongPass1" });
      const res = await loginHandler(req);
      expect(res.status).toBe(401);
    });

    it("should return 200 with user data and set cookies on success", async () => {
      const passwordHash = await hashPassword("CorrectPass1");
      users.set("test@test.com", {
        id: "user-1",
        email: "test@test.com",
        passwordHash,
        name: "Test User",
        position: "Manager",
        title: "Director",
        company: "TestCorp",
        questionnaireCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = createRequest({ email: "test@test.com", password: "CorrectPass1" });
      const res = await loginHandler(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("test@test.com");
      expect(body.data.user.profile.name).toBe("Test User");
      expect(body.data.user.questionnaireCompleted).toBe(true);

      // Check cookies are set
      const cookies = res.headers.getSetCookie();
      expect(cookies.some((c: string) => c.startsWith("auth_token="))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith("refresh_token="))).toBe(true);
    });

    it("should return 429 when rate limited", async () => {
      // Exhaust login rate limit (5 attempts)
      for (let i = 0; i < 5; i++) {
        const req = createRequest({ email: `nobody${i}@test.com`, password: "Pass1234" });
        await loginHandler(req);
      }

      const req = createRequest({ email: "nobody@test.com", password: "Pass1234" });
      const res = await loginHandler(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toContain("Too many");
    });
  });

  describe("POST /api/auth/register", () => {
    const validData = {
      email: "newuser@test.com",
      password: "StrongPass1",
      confirmPassword: "StrongPass1",
      name: "New User",
      position: "Engineer",
      title: "Staff Engineer",
    };

    it("should return 400 for invalid input", async () => {
      const req = createRequest({ email: "" });
      const res = await registerHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.success).toBe(false);
    });

    it("should return 400 for weak password", async () => {
      const req = createRequest({ ...validData, password: "weak", confirmPassword: "weak" });
      const res = await registerHandler(req);
      expect(res.status).toBe(400);
    });

    it("should return 400 for mismatched passwords", async () => {
      const req = createRequest({ ...validData, confirmPassword: "Different1" });
      const res = await registerHandler(req);
      expect(res.status).toBe(400);
    });

    it("should return 409 for existing email", async () => {
      users.set("newuser@test.com", {
        id: "existing",
        email: "newuser@test.com",
        passwordHash: "hash",
        name: "Existing",
        position: "Pos",
        title: "Title",
        questionnaireCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = createRequest(validData);
      const res = await registerHandler(req);
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toContain("already exists");
    });

    it("should return 201 with user data and set cookies on success", async () => {
      const req = createRequest(validData);
      const res = await registerHandler(req);
      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe("newuser@test.com");
      expect(body.data.user.profile.name).toBe("New User");
      expect(body.data.user.questionnaireCompleted).toBe(false);

      // Check cookies
      const cookies = res.headers.getSetCookie();
      expect(cookies.some((c: string) => c.startsWith("auth_token="))).toBe(true);
    });

    it("should store user in memory store", async () => {
      const req = createRequest(validData);
      await registerHandler(req);
      expect(users.has("newuser@test.com")).toBe(true);
      const stored = users.get("newuser@test.com");
      expect(stored?.name).toBe("New User");
    });
  });
});
