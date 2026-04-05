import type { Match } from "@/types";

/** Compact, model-friendly snapshot for Jynx (no PII beyond names/roles already in app). */
export function buildNetworkAssistantContext(
  selfName: string,
  matches: Match[]
): string {
  const active = [...matches]
    .filter((m) => !m.passed)
    .sort((a, b) => b.score - a.score)
    .slice(0, 28);

  if (active.length === 0) {
    return [
      `Primary attendee: ${selfName}.`,
      "No match list is loaded in this session yet. They may need to open the Matches page, complete the questionnaire, or refresh matches.",
      "You can still give general networking advice for a leadership summit (conversation tips, follow-up, prioritizing introductions).",
      "Do not invent specific attendee names or companies.",
    ].join("\n");
  }

  const highA = active.filter((m) => m.type === "high-affinity").length;
  const strat = active.filter((m) => m.type === "strategic").length;

  const lines = active.map((m, i) => {
    const p = m.matchedUser.profile;
    const role = [p.position || p.title, p.company].filter(Boolean).join(" · ");
    const common = m.commonalities.map((c) => c.description).join("; ");
    return [
      `${i + 1}. ${p.name}`,
      `   Match type: ${m.type} (strength ~${Math.round(m.score * 100)}%)`,
      role ? `   Role/org: ${role}` : "",
      common ? `   Shared / why matched: ${common}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    `Primary attendee: ${selfName}.`,
    `Summary: ${active.length} suggested connections (${highA} high-affinity, ${strat} strategic).`,
    "Use only the people and facts below when answering about their network. If asked about someone not listed, say that name is not in their current match list and suggest Search or expanding filters.",
    "",
    "Suggested connections:",
    ...lines,
  ].join("\n");
}
