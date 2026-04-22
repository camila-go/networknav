import { describe, it, expect } from "vitest";
import type { Commonality } from "@/types";
import { buildPersonalizedConversationStarters } from "./conversation-starters";

function com(category: Commonality["category"], description: string, weight = 0.7): Commonality {
  return { category, description, weight };
}

function joinAll(starters: string[]): string {
  return starters.join(" || ");
}

describe("buildPersonalizedConversationStarters — topic extraction", () => {
  it("strips 'Both bring X to teams' down to X", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Both bring Problem Solving to teams")],
      "strategic",
      "Kristeen"
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/bring\s+Problem\s+Solving\s+to\s+teams/i);
    expect(text).toMatch(/Problem Solving/);
  });

  it("strips 'Same summit rhythm: X' down to X", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Same summit rhythm: Planner")],
      "high-affinity",
      "Koren"
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/Same summit rhythm:/i);
    expect(text).toMatch(/Planner/);
  });

  it("strips 'Both lean X' down to X", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Both lean Builder")],
      "high-affinity",
      "Camila"
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/\blean Builder\b/);
    expect(text).toMatch(/Builder/);
  });

  it("strips 'Learning overlap: X' down to X", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Learning overlap: Decision Making")],
      "strategic",
      "Lisa"
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/Learning overlap:/i);
    expect(text).toMatch(/Decision Making/);
  });

  it("strips 'Could riff on X' down to X", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Could riff on Remote Leadership")],
      "high-affinity",
      "Drew"
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/Could riff on/i);
    expect(text).toMatch(/Remote Leadership/);
  });

  it("strips 'Complementary expertise: A + B' down to 'A + B'", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Complementary expertise: Strategy + Execution")],
      "strategic",
      "Morgan"
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/Complementary expertise:/i);
    expect(text).toMatch(/Strategy \+ Execution/);
  });

  it("strips 'Aligned focus: X' down to X", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Aligned focus: growing our APAC footprint")],
      "high-affinity",
      "Sam"
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/Aligned focus:/i);
    expect(text).toMatch(/growing our APAC footprint/);
  });

  it("strips 'Small joys: X' down to X", () => {
    const out = buildPersonalizedConversationStarters(
      [com("other", "Small joys: sourdough bread")],
      "high-affinity",
      "Priya"
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/Small joys:/i);
    expect(text).toMatch(/sourdough bread/);
  });
});

describe("buildPersonalizedConversationStarters — viewer-prefix injection", () => {
  it("does not double-name when the starter begins with the match's name", () => {
    // Force the high-affinity + professional branch where starters often
    // begin with "{name},"
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Both bring Problem Solving to teams")],
      "high-affinity",
      "Camila",
      { viewerFirstName: "Austin", seed: "camila-stable-1" }
    );
    const first = out[0] ?? "";
    // If the viewer prefix fired, check no double-name
    if (first.startsWith("Hi Camila —")) {
      const afterPrefix = first.replace(/^Hi Camila — Austin here\.\s*/, "");
      expect(afterPrefix).not.toMatch(/^Camila[,\s]/i);
    }
  });

  it("preserves all-caps names (ARIMBU stays ARIMBU, not aRIMBU)", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Senior IT Systems Engineer at Strategic Education, Inc.")],
      "strategic",
      "ARIMBU",
      { viewerFirstName: "Austin", seed: "arimbu-stable-1" }
    );
    const first = out[0] ?? "";
    expect(first).not.toMatch(/\baRIMBU\b/);
  });

  it("does not produce double periods after company names", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Senior IT Systems Engineer at Strategic Education, Inc.")],
      "strategic",
      "Arimbu",
      { viewerFirstName: "Austin", seed: "arimbu-stable-2" }
    );
    const text = joinAll(out);
    expect(text).not.toMatch(/\.\.(?!\.)/); // no ".." that isn't part of "..."
  });

  it("includes the viewer's name exactly once in the prefix", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Both bring Problem Solving to teams")],
      "strategic",
      "Lisa",
      { viewerFirstName: "Austin", seed: "lisa-stable-1" }
    );
    const first = out[0] ?? "";
    if (first.startsWith("Hi Lisa —")) {
      const matches = first.match(/Austin/g) ?? [];
      expect(matches.length).toBe(1);
    }
  });
});

describe("buildPersonalizedConversationStarters — basic shape", () => {
  it("returns 1-3 starters", () => {
    const out = buildPersonalizedConversationStarters(
      [com("professional", "Both bring Problem Solving to teams")],
      "strategic",
      "Kristeen"
    );
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.length).toBeLessThanOrEqual(3);
  });

  it("falls back gracefully when given no commonalities", () => {
    const out = buildPersonalizedConversationStarters([], "strategic", "Kristeen");
    expect(out.length).toBeGreaterThanOrEqual(1);
  });
});
