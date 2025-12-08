/**
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  validateEmail,
  validatePassword,
} from "./auth";

describe("Password Hashing", () => {
  it("should hash a password", async () => {
    const password = "TestPassword123";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it("should generate different hashes for the same password", async () => {
    const password = "TestPassword123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    expect(hash1).not.toBe(hash2);
  });

  it("should verify a correct password", async () => {
    const password = "TestPassword123";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);

    expect(isValid).toBe(true);
  });

  it("should reject an incorrect password", async () => {
    const password = "TestPassword123";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword("WrongPassword123", hash);

    expect(isValid).toBe(false);
  });

  it("should reject empty password", async () => {
    const hash = await hashPassword("TestPassword123");
    const isValid = await verifyPassword("", hash);

    expect(isValid).toBe(false);
  });
});

describe("JWT Token Management", () => {
  const testPayload = {
    userId: "test-user-id",
    email: "test@example.com",
  };

  describe("Access Tokens", () => {
    it("should create a valid access token", async () => {
      const token = await createAccessToken(testPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should verify a valid access token", async () => {
      const token = await createAccessToken(testPayload);
      const session = await verifyAccessToken(token);

      expect(session).toBeDefined();
      expect(session?.userId).toBe(testPayload.userId);
      expect(session?.email).toBe(testPayload.email);
      expect(session?.expiresAt).toBeInstanceOf(Date);
    });

    it("should return null for an invalid access token", async () => {
      const session = await verifyAccessToken("invalid-token");

      expect(session).toBeNull();
    });

    it("should return null for a tampered token", async () => {
      const token = await createAccessToken(testPayload);
      const tamperedToken = token.slice(0, -5) + "xxxxx";
      const session = await verifyAccessToken(tamperedToken);

      expect(session).toBeNull();
    });
  });

  describe("Refresh Tokens", () => {
    it("should create a valid refresh token", async () => {
      const token = await createRefreshToken({ userId: testPayload.userId });

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);
    });

    it("should verify a valid refresh token", async () => {
      const token = await createRefreshToken({ userId: testPayload.userId });
      const payload = await verifyRefreshToken(token);

      expect(payload).toBeDefined();
      expect(payload?.userId).toBe(testPayload.userId);
    });

    it("should return null for an invalid refresh token", async () => {
      const payload = await verifyRefreshToken("invalid-token");

      expect(payload).toBeNull();
    });
  });
});

describe("Email Validation", () => {
  it("should accept valid email addresses", () => {
    expect(validateEmail("test@example.com")).toBe(true);
    expect(validateEmail("user.name@domain.org")).toBe(true);
    expect(validateEmail("user+tag@example.co.uk")).toBe(true);
    expect(validateEmail("user123@test-domain.com")).toBe(true);
  });

  it("should reject invalid email addresses", () => {
    expect(validateEmail("")).toBe(false);
    expect(validateEmail("invalid")).toBe(false);
    expect(validateEmail("invalid@")).toBe(false);
    expect(validateEmail("@domain.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("user name@domain.com")).toBe(false);
  });
});

describe("Password Validation", () => {
  it("should accept valid passwords", () => {
    const result = validatePassword("SecurePass123");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject passwords shorter than 8 characters", () => {
    const result = validatePassword("Short1A");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must be at least 8 characters long"
    );
  });

  it("should reject passwords without uppercase letters", () => {
    const result = validatePassword("nouppercase123");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one uppercase letter"
    );
  });

  it("should reject passwords without lowercase letters", () => {
    const result = validatePassword("NOLOWERCASE123");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one lowercase letter"
    );
  });

  it("should reject passwords without numbers", () => {
    const result = validatePassword("NoNumbersHere");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Password must contain at least one number"
    );
  });

  it("should return multiple errors for very weak passwords", () => {
    const result = validatePassword("weak");
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

