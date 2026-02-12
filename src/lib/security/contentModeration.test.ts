/** @vitest-environment node */

import { describe, it, expect } from "vitest";
import { containsHarmfulContent, sanitizeText, moderateProfile } from "./contentModeration";

describe("Content Moderation", () => {
  describe("containsHarmfulContent", () => {
    it("should detect violent keywords", () => {
      expect(containsHarmfulContent("I want to kill someone")).toBe(true);
      expect(containsHarmfulContent("bomb the building")).toBe(true);
      expect(containsHarmfulContent("shoot them")).toBe(true);
      expect(containsHarmfulContent("murder mystery")).toBe(true);
      expect(containsHarmfulContent("attack the problem")).toBe(true);
    });

    it("should detect hate speech keywords", () => {
      expect(containsHarmfulContent("hate speech here")).toBe(true);
      expect(containsHarmfulContent("racist remark")).toBe(true);
      expect(containsHarmfulContent("nazi symbols")).toBe(true);
    });

    it("should detect self-harm keywords", () => {
      expect(containsHarmfulContent("suicide prevention")).toBe(true);
      expect(containsHarmfulContent("self-harm awareness")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(containsHarmfulContent("KILL")).toBe(true);
      expect(containsHarmfulContent("Kill")).toBe(true);
      expect(containsHarmfulContent("HATE")).toBe(true);
    });

    it("should return false for safe content", () => {
      expect(containsHarmfulContent("Hello, nice to meet you!")).toBe(false);
      expect(containsHarmfulContent("I love leadership conferences")).toBe(false);
      expect(containsHarmfulContent("Let's discuss innovation")).toBe(false);
    });

    it("should not false-positive on partial word matches", () => {
      // The regex uses \b word boundaries, so partial matches should be avoided
      expect(containsHarmfulContent("skilled worker")).toBe(false);
      expect(containsHarmfulContent("shatter expectations")).toBe(false);
    });
  });

  describe("sanitizeText", () => {
    it("should remove HTML tags", () => {
      expect(sanitizeText("<b>bold</b> text")).toBe("bold text");
      expect(sanitizeText("<script>alert('xss')</script>")).toBe("alert('xss')");
      expect(sanitizeText('<a href="evil.com">click</a>')).toBe("click");
    });

    it("should remove javascript: protocol", () => {
      expect(sanitizeText("javascript:alert(1)")).toBe("alert(1)");
      expect(sanitizeText("JAVASCRIPT:void(0)")).toBe("void(0)");
    });

    it("should remove event handlers", () => {
      expect(sanitizeText('div onclick=alert(1)')).toBe("div alert(1)");
      expect(sanitizeText("onmouseover=evil()")).toBe("evil()");
    });

    it("should trim whitespace", () => {
      expect(sanitizeText("  hello  ")).toBe("hello");
    });

    it("should truncate to 10000 characters", () => {
      const longText = "a".repeat(15000);
      const result = sanitizeText(longText);
      expect(result.length).toBe(10000);
    });

    it("should handle empty string", () => {
      expect(sanitizeText("")).toBe("");
    });

    it("should pass through clean text unchanged", () => {
      const clean = "This is perfectly safe text.";
      expect(sanitizeText(clean)).toBe(clean);
    });
  });

  describe("moderateProfile", () => {
    it("should return not-flagged for empty profile", async () => {
      const result = await moderateProfile({});
      expect(result.flagged).toBe(false);
      expect(result.categories).toEqual([]);
    });

    it("should return not-flagged for safe profile", async () => {
      const result = await moderateProfile({
        name: "Jane Doe",
        bio: "Passionate about technology and innovation",
        interests: ["hiking", "reading", "cooking"],
      });
      expect(result.flagged).toBe(false);
    });

    it("should flag profile with harmful name", async () => {
      const result = await moderateProfile({
        name: "kill all",
        bio: "Normal bio",
      });
      expect(result.flagged).toBe(true);
      expect(result.categories).toContain("Potentially Harmful Content");
    });

    it("should flag profile with harmful bio", async () => {
      const result = await moderateProfile({
        name: "Jane",
        bio: "I hate everything",
      });
      expect(result.flagged).toBe(true);
    });

    it("should flag profile with harmful interests", async () => {
      const result = await moderateProfile({
        name: "Jane",
        interests: ["bomb making"],
      });
      expect(result.flagged).toBe(true);
    });
  });
});
