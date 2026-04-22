/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { ensureMatchTypeMix, type MatchBuildRow } from "./ensure-match-type-mix";
import type { Match } from "@/types";

function row(
  type: Match["type"],
  aff: number,
  strat: number,
  score: number,
  id: string
): MatchBuildRow {
  return {
    match: {
      id,
      userId: "u1",
      matchedUserId: id,
      matchedUser: {
        id,
        profile: { name: `User ${id}`, title: "", company: "" },
        questionnaireCompleted: true,
      },
      type,
      commonalities: [
        { category: "professional", description: "Test commonality", weight: 0.5 },
      ],
      conversationStarters: ["A", "B"],
      score,
      generatedAt: new Date(),
      viewed: false,
      passed: false,
    },
    affinityScore: aff,
    strategicScore: strat,
    meta: { firstName: "U", seed: `u1-${id}` },
  };
}

describe("ensureMatchTypeMix", () => {
  it("returns unchanged when already mixed", () => {
    const rows = [
      row("high-affinity", 0.8, 0.1, 0.9, "a"),
      row("strategic", 0.2, 0.7, 0.6, "b"),
    ];
    const out = ensureMatchTypeMix(rows, "Viewer");
    expect(out.some((m) => m.type === "high-affinity")).toBe(true);
    expect(out.some((m) => m.type === "strategic")).toBe(true);
    expect(out).toHaveLength(2);
  });

  it("splits when all strategic", () => {
    const rows = [
      row("strategic", 0.9, 0.05, 0.8, "a"),
      row("strategic", 0.5, 0.4, 0.7, "b"),
      row("strategic", 0.2, 0.2, 0.6, "c"),
    ];
    const out = ensureMatchTypeMix(rows, "Viewer");
    expect(out.filter((m) => m.type === "high-affinity").length).toBeGreaterThan(0);
    expect(out.filter((m) => m.type === "strategic").length).toBeGreaterThan(0);
  });

  it("passes through a single match", () => {
    const rows = [row("strategic", 0.1, 0.9, 0.5, "only")];
    const out = ensureMatchTypeMix(rows, "V");
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("strategic");
  });

  it("does not promote thin rows into high-affinity when forcing a mix", () => {
    // All rows have sub-threshold affinity. The force-mix would normally
    // relabel the top half as "high-affinity" to guarantee variety — but
    // that lies about how strong the match is. Stay strategic instead.
    const rows = [
      row("strategic", 0.08, 0.05, 0.07, "a"),
      row("strategic", 0.06, 0.05, 0.06, "b"),
      row("strategic", 0.05, 0.04, 0.05, "c"),
    ];
    const out = ensureMatchTypeMix(rows, "Viewer");
    expect(out.every((m) => m.type === "strategic")).toBe(true);
  });
});
