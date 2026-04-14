/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { users } from "@/lib/stores";
import { resetRateLimit } from "@/lib/security/rateLimit";

// Mock Supabase to prevent external calls
vi.mock("@/lib/supabase/client", () => ({
  supabaseAdmin: null,
  isSupabaseConfigured: false,
}));

// Mock fns must be hoisted
const mockValidatePostResponseAsync = vi.hoisted(() => vi.fn());
const mockGetAuthorizeUrlAsync = vi.hoisted(() => vi.fn());
const mockGenerateServiceProviderMetadata = vi.hoisted(() => vi.fn());

// Mock the SAML config module so we control the SAML instance
vi.mock("@/lib/saml/config", () => ({
  isSsoEnabled: () => true,
  isSsoForced: () => false,
  getSpCert: () => undefined,
  generateSpMetadataXml: () => mockGenerateServiceProviderMetadata(),
  getSaml: () => ({
    validatePostResponseAsync: mockValidatePostResponseAsync,
    getAuthorizeUrlAsync: mockGetAuthorizeUrlAsync,
    generateServiceProviderMetadata: mockGenerateServiceProviderMetadata,
  }),
}));

// Set env vars
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

// Import route handlers after mocks are set up
import { GET as metadataHandler } from "@/app/api/auth/sso/metadata/route";
import { GET as loginHandler } from "@/app/api/auth/sso/login/route";
import { POST as callbackHandler } from "@/app/api/auth/sso/callback/route";

describe("SSO API Routes", () => {
  beforeEach(() => {
    users.clear();
    resetRateLimit("sso-callback:unknown", "sso-callback");
    vi.clearAllMocks();
  });

  describe("GET /api/auth/sso/metadata", () => {
    it("should return XML metadata when SSO is enabled", async () => {
      const metadataXml =
        '<EntityDescriptor entityID="http://localhost:3000/api/auth/sso/metadata"></EntityDescriptor>';
      mockGenerateServiceProviderMetadata.mockReturnValue(metadataXml);

      const res = await metadataHandler();
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/xml");

      const body = await res.text();
      expect(body).toContain("EntityDescriptor");
    });
  });

  describe("GET /api/auth/sso/login", () => {
    it("should redirect to IdP SSO URL", async () => {
      const idpUrl = "https://idp.example.com/saml2/sso?SAMLRequest=encoded";
      mockGetAuthorizeUrlAsync.mockResolvedValue(idpUrl);

      const res = await loginHandler();
      // NextResponse.redirect defaults to 307
      expect(res.status).toBe(307);
      expect(res.headers.get("Location")).toBe(idpUrl);
    });
  });

  describe("POST /api/auth/sso/callback", () => {
    function createSamlCallbackRequest(
      samlResponse: string,
      headers?: Record<string, string>
    ): NextRequest {
      const formBody = new URLSearchParams();
      formBody.set("SAMLResponse", samlResponse);

      const reqHeaders = new Headers(headers || {});
      reqHeaders.set("content-type", "application/x-www-form-urlencoded");

      return new NextRequest("http://localhost:3000/api/auth/sso/callback", {
        method: "POST",
        headers: reqHeaders,
        body: formBody.toString(),
      });
    }

    it("should return 400 when SAMLResponse is missing", async () => {
      const reqHeaders = new Headers();
      reqHeaders.set("content-type", "application/x-www-form-urlencoded");
      const req = new NextRequest(
        "http://localhost:3000/api/auth/sso/callback",
        {
          method: "POST",
          headers: reqHeaders,
          body: "",
        }
      );

      const res = await callbackHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Missing SAMLResponse");
    });

    it("should redirect to login with error when assertion validation fails", async () => {
      mockValidatePostResponseAsync.mockRejectedValue(
        new Error("Signature verification failed")
      );

      const req = createSamlCallbackRequest("invalid-saml-response");
      const res = await callbackHandler(req);

      // Should redirect to login page with error
      expect(res.status).toBe(302);
      const location = res.headers.get("Location") || "";
      expect(location).toContain("/login");
      expect(location).toContain("error=sso_failed");
    });

    it("should return 400 when assertion has no email", async () => {
      mockValidatePostResponseAsync.mockResolvedValue({
        profile: {
          nameID: "",
          name: "Test User",
        },
      });

      const req = createSamlCallbackRequest("valid-saml-response");
      const res = await callbackHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("email");
    });

    it("should provision new user and redirect to onboarding", async () => {
      mockValidatePostResponseAsync.mockResolvedValue({
        profile: {
          nameID: "user@company.com",
          name: "Jane Doe",
          title: "VP Engineering",
          company: "Acme Corp",
        },
      });

      const req = createSamlCallbackRequest("valid-saml-response");
      const res = await callbackHandler(req);

      // Should redirect to onboarding for new users
      expect(res.status).toBe(302);
      const location = res.headers.get("Location") || "";
      expect(location).toContain("/onboarding");

      // Should set auth cookies
      const cookies = res.headers.getSetCookie();
      const cookieString = cookies.join("; ");
      expect(cookieString).toContain("auth_token=");
      expect(cookieString).toContain("refresh_token=");

      // User should exist in memory store
      const user = users.get("user@company.com");
      expect(user).toBeDefined();
      expect(user?.name).toBe("Jane Doe");
      expect(user?.title).toBe("VP Engineering");
      expect(user?.company).toBe("Acme Corp");
      expect(user?.questionnaireCompleted).toBe(false);
      // SSO users have non-authenticatable passwords
      expect(user?.passwordHash).toContain("SAML_SSO:");
    });

    it("should redirect returning user to dashboard when questionnaire is completed", async () => {
      // Pre-populate a user who has completed the questionnaire
      users.set("returning@company.com", {
        id: "existing-user-id",
        email: "returning@company.com",
        passwordHash: "SAML_SSO:some-random-hash",
        name: "Returning User",
        title: "Director",
        company: "Acme Corp",
        questionnaireCompleted: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockValidatePostResponseAsync.mockResolvedValue({
        profile: {
          nameID: "returning@company.com",
          name: "Returning User",
          title: "Director",
          company: "Acme Corp",
        },
      });

      const req = createSamlCallbackRequest("valid-saml-response");
      const res = await callbackHandler(req);

      expect(res.status).toBe(302);
      const location = res.headers.get("Location") || "";
      expect(location).toContain("/dashboard");
    });

    it("should not create duplicate users on repeated SSO login", async () => {
      mockValidatePostResponseAsync.mockResolvedValue({
        profile: {
          nameID: "user@company.com",
          name: "Jane Doe",
          title: "VP Engineering",
        },
      });

      const req1 = createSamlCallbackRequest("valid-saml-response");
      await callbackHandler(req1);
      const userId1 = users.get("user@company.com")?.id;

      // Reset rate limit for second request
      resetRateLimit("sso-callback:unknown", "sso-callback");

      const req2 = createSamlCallbackRequest("valid-saml-response");
      await callbackHandler(req2);
      const userId2 = users.get("user@company.com")?.id;

      // Same user ID, not a duplicate
      expect(userId1).toBe(userId2);
      // Only one entry in the store
      expect(users.size).toBe(1);
    });

    it("should sync updated attributes from IdP on returning login", async () => {
      // User originally registered with old title
      users.set("user@company.com", {
        id: "user-id-1",
        email: "user@company.com",
        passwordHash: "SAML_SSO:random",
        name: "Jane Doe",
        title: "Manager",
        company: "Old Corp",
        questionnaireCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // IdP now sends updated attributes
      mockValidatePostResponseAsync.mockResolvedValue({
        profile: {
          nameID: "user@company.com",
          name: "Jane Doe-Smith",
          title: "VP Engineering",
          company: "New Corp",
        },
      });

      const req = createSamlCallbackRequest("valid-saml-response");
      await callbackHandler(req);

      const user = users.get("user@company.com");
      expect(user?.name).toBe("Jane Doe-Smith");
      expect(user?.title).toBe("VP Engineering");
      expect(user?.company).toBe("New Corp");
    });

    it("should rate limit excessive SSO callback attempts", async () => {
      mockValidatePostResponseAsync.mockResolvedValue({
        profile: {
          nameID: "user@company.com",
          name: "Test",
          title: "Test",
        },
      });

      // Exhaust rate limit (20 per minute)
      for (let i = 0; i < 20; i++) {
        const req = createSamlCallbackRequest("valid-saml-response");
        await callbackHandler(req);
      }

      // 21st request should be rate limited
      const req = createSamlCallbackRequest("valid-saml-response");
      const res = await callbackHandler(req);
      expect(res.status).toBe(429);
    });
  });
});
