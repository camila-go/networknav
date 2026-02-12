/** @vitest-environment node */

import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  questionnaireResponseSchema,
  messageSchema,
} from "./validations";

describe("Validation Schemas", () => {
  describe("loginSchema", () => {
    it("should accept valid email and password", () => {
      const result = loginSchema.safeParse({ email: "user@test.com", password: "password123" });
      expect(result.success).toBe(true);
    });

    it("should reject empty email", () => {
      const result = loginSchema.safeParse({ email: "", password: "password123" });
      expect(result.success).toBe(false);
    });

    it("should reject invalid email format", () => {
      const result = loginSchema.safeParse({ email: "not-an-email", password: "password123" });
      expect(result.success).toBe(false);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({ email: "user@test.com", password: "" });
      expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    const validData = {
      email: "newuser@test.com",
      password: "StrongPass1",
      confirmPassword: "StrongPass1",
      name: "John Doe",
      position: "Engineering Manager",
      title: "Senior Director",
      company: "TestCorp",
    };

    it("should accept valid registration data", () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject password under 8 characters", () => {
      const result = registerSchema.safeParse({ ...validData, password: "Short1", confirmPassword: "Short1" });
      expect(result.success).toBe(false);
    });

    it("should reject password without uppercase", () => {
      const result = registerSchema.safeParse({ ...validData, password: "nouppercase1", confirmPassword: "nouppercase1" });
      expect(result.success).toBe(false);
    });

    it("should reject password without lowercase", () => {
      const result = registerSchema.safeParse({ ...validData, password: "NOLOWERCASE1", confirmPassword: "NOLOWERCASE1" });
      expect(result.success).toBe(false);
    });

    it("should reject password without number", () => {
      const result = registerSchema.safeParse({ ...validData, password: "NoNumberHere", confirmPassword: "NoNumberHere" });
      expect(result.success).toBe(false);
    });

    it("should reject mismatched confirmPassword", () => {
      const result = registerSchema.safeParse({ ...validData, confirmPassword: "Different1" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join("."));
        expect(paths).toContain("confirmPassword");
      }
    });

    it("should reject name under 2 characters", () => {
      const result = registerSchema.safeParse({ ...validData, name: "A" });
      expect(result.success).toBe(false);
    });

    it("should require position field", () => {
      const { position, ...withoutPosition } = validData;
      const result = registerSchema.safeParse(withoutPosition);
      expect(result.success).toBe(false);
    });

    it("should require title field", () => {
      const { title, ...withoutTitle } = validData;
      const result = registerSchema.safeParse(withoutTitle);
      expect(result.success).toBe(false);
    });

    it("should accept optional company", () => {
      const { company, ...withoutCompany } = validData;
      const result = registerSchema.safeParse(withoutCompany);
      expect(result.success).toBe(true);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("should accept valid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "user@test.com" });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("should accept matching valid passwords", () => {
      const result = resetPasswordSchema.safeParse({
        password: "NewPass123",
        confirmPassword: "NewPass123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject mismatched passwords", () => {
      const result = resetPasswordSchema.safeParse({
        password: "NewPass123",
        confirmPassword: "Different123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject weak password", () => {
      const result = resetPasswordSchema.safeParse({
        password: "weak",
        confirmPassword: "weak",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("profileSchema", () => {
    it("should accept valid profile data", () => {
      const result = profileSchema.safeParse({
        name: "Jane Doe",
        position: "CTO",
        title: "Chief Technology Officer",
      });
      expect(result.success).toBe(true);
    });

    it("should accept optional fields", () => {
      const result = profileSchema.safeParse({
        name: "Jane Doe",
        position: "CTO",
        title: "CTO",
        company: "Acme",
        location: "NYC",
        photoUrl: "https://example.com/photo.jpg",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid photoUrl", () => {
      const result = profileSchema.safeParse({
        name: "Jane Doe",
        position: "CTO",
        title: "CTO",
        photoUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("should accept empty string photoUrl", () => {
      const result = profileSchema.safeParse({
        name: "Jane Doe",
        position: "CTO",
        title: "CTO",
        photoUrl: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("questionnaireResponseSchema", () => {
    it("should accept valid questionnaire data", () => {
      const result = questionnaireResponseSchema.safeParse({
        industry: "technology",
        leadershipPriorities: ["innovation", "growth"],
        rechargeActivities: ["hiking", "reading"],
      });
      expect(result.success).toBe(true);
    });

    it("should enforce max 5 leadershipPriorities", () => {
      const result = questionnaireResponseSchema.safeParse({
        leadershipPriorities: ["a", "b", "c", "d", "e", "f"],
      });
      expect(result.success).toBe(false);
    });

    it("should enforce max 8 rechargeActivities", () => {
      const result = questionnaireResponseSchema.safeParse({
        rechargeActivities: Array.from({ length: 9 }, (_, i) => `activity-${i}`),
      });
      expect(result.success).toBe(false);
    });

    it("should enforce max 3 relationshipValues", () => {
      const result = questionnaireResponseSchema.safeParse({
        relationshipValues: ["a", "b", "c", "d"],
      });
      expect(result.success).toBe(false);
    });

    it("should accept all optional fields as undefined", () => {
      const result = questionnaireResponseSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("messageSchema", () => {
    it("should accept valid message", () => {
      const result = messageSchema.safeParse({ content: "Hello there!" });
      expect(result.success).toBe(true);
    });

    it("should reject empty message", () => {
      const result = messageSchema.safeParse({ content: "" });
      expect(result.success).toBe(false);
    });

    it("should reject message over 2000 characters", () => {
      const result = messageSchema.safeParse({ content: "x".repeat(2001) });
      expect(result.success).toBe(false);
    });

    it("should accept message at exactly 2000 characters", () => {
      const result = messageSchema.safeParse({ content: "x".repeat(2000) });
      expect(result.success).toBe(true);
    });
  });
});
