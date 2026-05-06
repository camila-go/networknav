import { describe, it, expect } from "vitest";
import { teamsChartUrl, teamsMeetingUrl } from "./utils";

describe("teamsChartUrl", () => {
  it("encodes spaces in composeMessage as %20, not +", () => {
    const url = teamsChartUrl("user@example.com", {
      composeMessage:
        "Camila, I was impressed by how Strategic Education's recent platform redesign balances accessibility with aesthetic flair.",
    });

    expect(url).not.toMatch(/\+/);
    expect(url).toMatch(/message=Camila%2C%20I%20was%20impressed%20by/);
    expect(url.startsWith("https://teams.microsoft.com/l/chat/0/0?")).toBe(true);
  });

  it("percent-encodes literal + in email as %2B (e.g. plus-tag addresses)", () => {
    const url = teamsChartUrl("name+tag@example.com");
    expect(url).toContain("users=name%2Btag%40example.com");
    expect(url).not.toContain("+");
  });

  it("omits message param entirely when composeMessage is missing or blank", () => {
    expect(teamsChartUrl("user@example.com")).toBe(
      "https://teams.microsoft.com/l/chat/0/0?users=user%40example.com"
    );
    expect(teamsChartUrl("user@example.com", { composeMessage: "   " })).toBe(
      "https://teams.microsoft.com/l/chat/0/0?users=user%40example.com"
    );
  });
});

describe("teamsMeetingUrl", () => {
  it("encodes spaces in subject as %20, not +", () => {
    const url = teamsMeetingUrl("user@example.com", "Catch up about GS26");
    expect(url).not.toMatch(/\+/);
    expect(url).toContain("subject=Catch%20up%20about%20GS26");
  });

  it("omits subject when not provided", () => {
    expect(teamsMeetingUrl("user@example.com")).toBe(
      "https://teams.microsoft.com/l/meeting/new?attendees=user%40example.com"
    );
  });
});
