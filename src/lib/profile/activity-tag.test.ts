/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import {
  normalizeActivityTag,
  suggestActivityTagFromPersonalInterest,
} from "./activity-tag";

describe("activity-tag", () => {
  it("normalizeActivityTag lowercases and strips junk", () => {
    expect(normalizeActivityTag("  Gardening!  ")).toBe("gardening");
    expect(normalizeActivityTag("Trail Running")).toBe("trail running");
  });

  it("normalizeActivityTag returns null for empty", () => {
    expect(normalizeActivityTag("")).toBe(null);
    expect(normalizeActivityTag("!!!")).toBe(null);
  });

  it("suggestActivityTagFromPersonalInterest uses first clause", () => {
    expect(
      suggestActivityTagFromPersonalInterest("gardening, reading, cats")
    ).toBe("gardening");
  });
});
