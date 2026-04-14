import { describe, it, expect } from "vitest";
import {
  buildThemeEnrichment,
  emptyEnrichment,
  type EnrichmentPhotoRow,
  type EnrichmentProfile,
  type EnrichmentQuestionnaire,
} from "./build-theme-enrichment";

function profile(id: string, overrides: Partial<EnrichmentProfile> = {}): EnrichmentProfile {
  return { id, name: `User ${id}`, ...overrides };
}

describe("buildThemeEnrichment", () => {
  it("returns empty map when no photos", () => {
    const result = buildThemeEnrichment([], new Map(), new Map());
    expect(result.size).toBe(0);
  });

  it("aggregates top titles/locations/companies per tag", () => {
    const photos: EnrichmentPhotoRow[] = [
      { user_id: "a", activity_tag: "kayaking" },
      { user_id: "b", activity_tag: "kayaking" },
      { user_id: "c", activity_tag: "kayaking" },
      { user_id: "d", activity_tag: "hiking" },
    ];
    const profiles = new Map<string, EnrichmentProfile>([
      ["a", profile("a", { title: "CEO", location: "CA", company: "Acme" })],
      ["b", profile("b", { title: "CEO", location: "NY", company: "Acme" })],
      ["c", profile("c", { title: "CTO", location: "CA", company: "Beta" })],
      ["d", profile("d", { title: "CEO", location: "TX", company: "Gamma" })],
    ]);

    const result = buildThemeEnrichment(photos, profiles, new Map());
    const kayaking = result.get("kayaking");
    expect(kayaking).toBeDefined();
    expect(kayaking!.profiledUserCount).toBe(3);
    expect(kayaking!.topTitles[0]).toEqual({ value: "CEO", count: 2, percent: 66.7 });
    expect(kayaking!.topLocations[0]).toEqual({ value: "CA", count: 2, percent: 66.7 });
    expect(kayaking!.topCompanies[0]).toEqual({ value: "Acme", count: 2, percent: 66.7 });
  });

it("computes mode for growthArea and talkTopic from questionnaire", () => {
    const photos: EnrichmentPhotoRow[] = [
      { user_id: "a", activity_tag: "yoga" },
      { user_id: "b", activity_tag: "yoga" },
      { user_id: "c", activity_tag: "yoga" },
    ];
    const profiles = new Map([
      ["a", profile("a")],
      ["b", profile("b")],
      ["c", profile("c")],
    ]);
    const q = new Map<string, EnrichmentQuestionnaire>([
      ["a", { growthArea: "storytelling", talkTopic: "AI" }],
      ["b", { growthArea: "storytelling", talkTopic: "leadership" }],
      ["c", { growthArea: "hiring", talkTopic: "AI" }],
    ]);
    const result = buildThemeEnrichment(photos, profiles, q);
    const yoga = result.get("yoga")!;
    expect(yoga.topGrowthArea).toBe("storytelling");
    expect(yoga.topTalkTopic).toBe("AI");
  });

  it("attaches first non-empty caption per tag", () => {
    const photos: EnrichmentPhotoRow[] = [
      { user_id: "a", activity_tag: "surfing", caption: null },
      { user_id: "b", activity_tag: "surfing", caption: "  " },
      { user_id: "c", activity_tag: "surfing", caption: "Pipeline at dawn" },
      { user_id: "d", activity_tag: "surfing", caption: "Another caption" },
    ];
    const profiles = new Map([
      ["a", profile("a")],
      ["b", profile("b")],
      ["c", profile("c", { name: "Ada" })],
      ["d", profile("d")],
    ]);
    const result = buildThemeEnrichment(photos, profiles, new Map());
    expect(result.get("surfing")!.sampleCaption).toEqual({
      text: "Pipeline at dawn",
      userName: "Ada",
    });
  });

  it("ignores photos for users not in profile map", () => {
    const photos: EnrichmentPhotoRow[] = [
      { user_id: "missing", activity_tag: "running" },
      { user_id: "a", activity_tag: "running" },
    ];
    const profiles = new Map([["a", profile("a", { title: "VP" })]]);
    const result = buildThemeEnrichment(photos, profiles, new Map());
    expect(result.get("running")!.profiledUserCount).toBe(1);
    expect(result.get("running")!.topTitles[0].value).toBe("VP");
  });

  it("normalizes tags to lowercase and trims", () => {
    const photos: EnrichmentPhotoRow[] = [
      { user_id: "a", activity_tag: "  Cooking " },
      { user_id: "b", activity_tag: "cooking" },
    ];
    const profiles = new Map([
      ["a", profile("a", { title: "Chef" })],
      ["b", profile("b", { title: "Chef" })],
    ]);
    const result = buildThemeEnrichment(photos, profiles, new Map());
    expect(result.has("cooking")).toBe(true);
    expect(result.get("cooking")!.profiledUserCount).toBe(2);
  });

  it("caps topTitles at 3", () => {
    const photos: EnrichmentPhotoRow[] = Array.from({ length: 5 }, (_, i) => ({
      user_id: `u${i}`,
      activity_tag: "hiking",
    }));
    const profiles = new Map(
      photos.map((p, i) => [p.user_id, profile(p.user_id, { title: `Title${i}` })])
    );
    const result = buildThemeEnrichment(photos, profiles, new Map());
    expect(result.get("hiking")!.topTitles).toHaveLength(3);
  });
});

describe("emptyEnrichment", () => {
  it("returns a fully empty enrichment block", () => {
    const e = emptyEnrichment();
    expect(e.topTitles).toEqual([]);
    expect(e.topLocations).toEqual([]);
    expect(e.topCompanies).toEqual([]);
    expect(e.topGrowthArea).toBeNull();
    expect(e.topTalkTopic).toBeNull();
    expect(e.sampleCaption).toBeNull();
    expect(e.profiledUserCount).toBe(0);
  });
});
