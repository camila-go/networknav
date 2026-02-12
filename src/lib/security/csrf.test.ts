/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock next/headers cookies()
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

import {
  generateCsrfToken,
  validateCsrfToken,
  setCsrfCookie,
  withCsrfProtection,
  getCsrfTokenHandler,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "./csrf";

function createRequest(method: string, options?: {
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}): NextRequest {
  const url = "http://localhost:3000/api/test";
  const headers = new Headers(options?.headers || {});

  if (options?.cookies) {
    const cookieStr = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    headers.set("cookie", cookieStr);
  }

  return new NextRequest(url, { method, headers });
}

describe("CSRF Protection", () => {
  describe("generateCsrfToken", () => {
    it("should return a token with timestamp.random format", () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[a-z0-9]+\.[a-f0-9]+$/);
      const parts = token.split(".");
      expect(parts).toHaveLength(2);
    });

    it("should generate unique tokens each call", () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("validateCsrfToken", () => {
    it("should pass for GET requests", async () => {
      const req = createRequest("GET");
      const result = await validateCsrfToken(req);
      expect(result.valid).toBe(true);
    });

    it("should pass for HEAD requests", async () => {
      const req = createRequest("HEAD");
      const result = await validateCsrfToken(req);
      expect(result.valid).toBe(true);
    });

    it("should pass for OPTIONS requests", async () => {
      const req = createRequest("OPTIONS");
      const result = await validateCsrfToken(req);
      expect(result.valid).toBe(true);
    });

    it("should fail when cookie is missing", async () => {
      const req = createRequest("POST", {
        headers: { [CSRF_HEADER_NAME]: "some-token" },
      });
      const result = await validateCsrfToken(req);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cookie missing");
    });

    it("should fail when header is missing", async () => {
      const token = generateCsrfToken();
      const req = createRequest("POST", {
        cookies: { [CSRF_COOKIE_NAME]: token },
      });
      const result = await validateCsrfToken(req);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("header missing");
    });

    it("should fail when tokens don't match", async () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      const req = createRequest("POST", {
        cookies: { [CSRF_COOKIE_NAME]: token1 },
        headers: { [CSRF_HEADER_NAME]: token2 },
      });
      const result = await validateCsrfToken(req);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("mismatch");
    });

    it("should pass when cookie and header match and not expired", async () => {
      const token = generateCsrfToken();
      const req = createRequest("POST", {
        cookies: { [CSRF_COOKIE_NAME]: token },
        headers: { [CSRF_HEADER_NAME]: token },
      });
      const result = await validateCsrfToken(req);
      expect(result.valid).toBe(true);
    });

    it("should fail when token is expired", async () => {
      // Create a token with an old timestamp
      const oldTimestamp = (Date.now() - 2 * 60 * 60 * 1000).toString(36); // 2 hours ago
      const randomPart = crypto.randomUUID().replace(/-/g, "");
      const expiredToken = `${oldTimestamp}.${randomPart}`;

      const req = createRequest("POST", {
        cookies: { [CSRF_COOKIE_NAME]: expiredToken },
        headers: { [CSRF_HEADER_NAME]: expiredToken },
      });
      const result = await validateCsrfToken(req);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("setCsrfCookie", () => {
    it("should set cookie with correct name", () => {
      const response = NextResponse.json({ ok: true });
      const token = setCsrfCookie(response);
      expect(token).toBeTruthy();
      // The cookie is set on the response
      const cookieHeader = response.headers.get("set-cookie");
      expect(cookieHeader).toContain(CSRF_COOKIE_NAME);
    });

    it("should use provided token or generate one", () => {
      const response = NextResponse.json({ ok: true });
      const myToken = "custom.token123";
      const result = setCsrfCookie(response, myToken);
      expect(result).toBe(myToken);
    });
  });

  describe("withCsrfProtection", () => {
    it("should call handler when token valid", async () => {
      const token = generateCsrfToken();
      const req = createRequest("POST", {
        cookies: { [CSRF_COOKIE_NAME]: token },
        headers: { [CSRF_HEADER_NAME]: token },
      });
      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const result = await withCsrfProtection(req, handler);
      expect(handler).toHaveBeenCalledOnce();
    });

    it("should return 403 when token invalid", async () => {
      const req = createRequest("POST");
      const handler = vi.fn();
      const result = await withCsrfProtection(req, handler);
      expect(handler).not.toHaveBeenCalled();
      // Result should be a NextResponse with 403
      if (result instanceof NextResponse) {
        expect(result.status).toBe(403);
        const body = await result.json();
        expect(body.success).toBe(false);
        expect(body.error).toContain("CSRF");
      }
    });
  });

  describe("getCsrfTokenHandler", () => {
    it("should return token in response JSON", async () => {
      const response = await getCsrfTokenHandler();
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.csrfToken).toBeDefined();
      expect(typeof body.data.csrfToken).toBe("string");
    });
  });
});
