import type { Commonality, MatchType } from "@/types";

export type ConversationStarterExtras = {
  theirTitle?: string;
  theirCompany?: string;
  viewerFirstName?: string;
  /** Stable id so the same pair gets consistent but distinct templates from other pairs */
  seed?: string;
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(arr: T[], seed: number, offset: number): T {
  return arr[(seed + offset * 31) % arr.length]!;
}

/** Readable fragment from a commonality line */
function topicFromDescription(desc: string): string {
  let t = desc
    .replace(/^both\s+/i, "")
    .replace(/^we\s+both\s+/i, "")
    .replace(/^both\s+enjoy\s+/i, "")
    .replace(/^both\s+value\s+/i, "")
    .trim();
  if (t.length > 70) t = `${t.slice(0, 67)}…`;
  return t || "what brought us into the same orbit here";
}

function orgPhrase(company?: string): string {
  const c = company?.trim();
  if (c) return c;
  return "your org";
}

/** e.g. "Manager at SEI" — reads badly as a "topic"; phrase as role + org instead */
function parseTitleAtCompany(text: string): { role: string; company: string } | null {
  const t = text.trim();
  const m = t.match(/^(.+?)\s+at\s+(.+)$/i);
  if (!m) return null;
  const role = m[1].replace(/^both\s+/i, "").replace(/^we\s+/i, "").trim();
  const company = m[2].trim();
  if (!role || !company || role.length > 55 || company.length > 45) return null;
  if (/^(similar|complementary|both|fellow)/i.test(role)) return null;
  if (/\b(industry|sector|space|challenges|expertise)\b/i.test(t) && role.length > 25)
    return null;
  if (/^(their organization|their org|your org|n\/a)$/i.test(company)) return null;
  return { role, company };
}

function roleAtCompanyStarters(
  name: string,
  role: string,
  company: string,
  matchType: MatchType,
  seed: number,
  offset: number
): string[] {
  const r = role.replace(/\s+/g, " ");
  const c = company;
  const rLower = r.charAt(0) === r.charAt(0).toUpperCase() && !r.includes(",") ? r.toLowerCase() : r;
  if (matchType === "strategic") {
    return [
      `${name}, your vantage point as ${withArticle(rLower)} at ${c} is different from mine—I’d love a quick outside perspective.`,
      `${name}, I’m trying to get sharper on leadership challenges—how does the world look from ${withArticle(rLower)} at ${c}?`,
      `${name}, we’re in complementary lanes. I’d really value your take on what you’re focused on at ${c}.`,
      `${name}, what’s one thing you wish people outside ${c} understood about the ${r} role?`,
    ];
  }
  return [
    `${name}, great to connect—what’s most interesting on your plate as ${withArticle(rLower)} at ${c} right now?`,
    `Would love to compare notes—how are things going for you at ${c} in the ${r} world?`,
    `${name}, always curious how ${c} shows up day-to-day when you’re in a ${r}-type role.`,
  ];
}

function withArticle(rolePhrase: string): string {
  const t = rolePhrase.trim().toLowerCase();
  if (!t) return rolePhrase;
  if (/^(a|an|the)\s/.test(t)) return rolePhrase;
  if (/^(hr|mvp|mba)\b/i.test(rolePhrase)) return `an ${rolePhrase}`;
  return /^[aeiou]/i.test(t) ? `an ${rolePhrase}` : `a ${rolePhrase}`;
}

/**
 * Rich, varied conversation starters keyed off commonalities, roles, and a stable seed.
 */
export function buildPersonalizedConversationStarters(
  commonalities: Commonality[],
  matchType: MatchType,
  theirFirstName?: string,
  extras?: ConversationStarterExtras
): string[] {
  const seed = hashSeed(
    extras?.seed || `${theirFirstName || "x"}-${commonalities.map((c) => c.description).join("|")}`
  );
  const name = theirFirstName?.trim() || "there";
  const company = extras?.theirCompany?.trim();
  const role = extras?.theirTitle?.trim();
  const viewer = extras?.viewerFirstName?.trim();
  const org = orgPhrase(company);

  const starters: string[] = [];
  const used = new Set<string>();

  const push = (s: string) => {
    const key = s.toLowerCase().slice(0, 80);
    if (!used.has(key)) {
      used.add(key);
      starters.push(s);
    }
  };

  const coms = commonalities.length ? commonalities : [];

  for (let i = 0; i < Math.min(coms.length, 4) && starters.length < 4; i++) {
    const c = coms[i]!;
    const topic = topicFromDescription(c.description);
    const s = seed + i * 7919;

    if (c.category === "professional") {
      const tac = parseTitleAtCompany(c.description);
      if (tac) {
        push(pick(roleAtCompanyStarters(name, tac.role, tac.company, matchType, s, i), s, i));
      } else if (matchType === "high-affinity") {
        push(
          pick(
            [
              `${name}, I noticed we connect on ${topic}—what’s been most alive for you in that space lately?`,
              `Would love to compare notes on ${topic}—how are you tackling it at ${org}?`,
              `The overlap on ${topic} stood out—if we had coffee, what would you want to dig into first?`,
              `${name}, I’m in a similar lane with ${topic}. What’s one lesson that’s stuck with you?`,
              `Curious how ${topic} shows up day-to-day for you versus what I’m seeing on my side.`,
            ],
            s,
            i
          )
        );
      } else {
        push(
          pick(
            [
              `${name}, your angle on ${topic} feels complementary—I’d love a quick outside perspective.`,
              `I’m trying to get sharper on ${topic}; would value how ${name} and ${org} think about it.`,
              `Strategic ask: how do you prioritize ${topic} when everything’s competing for attention?`,
              `${name}, different lane, same leadership puzzles—mind if I pick your brain on ${topic}?`,
            ],
            s,
            i
          )
        );
      }
    } else if (c.category === "hobby") {
      push(
        pick(
          [
            `Rare to see ${topic} in a match—${name}, any favorite ritual or spot you’d recommend?`,
            `${topic} jumped out—always hunting tips if you’re open to swapping stories.`,
            `Fellow fan of ${topic}—what got you hooked?`,
          ],
          s,
          i
        )
      );
    } else if (c.category === "values") {
      push(
        pick(
          [
            `Sounds like we care about similar things around ${topic}—${name}, how does that show up in how you lead?`,
            `The ${topic} thread resonated—what drew you there personally?`,
            `I’m curious how ${topic} shapes decisions for you when things get noisy.`,
          ],
          s,
          i
        )
      );
    } else {
      push(
        pick(
          [
            `${name}, we both seem to care about ${topic}—how do you protect that in a packed quarter?`,
            `How does ${topic} fit into your rhythm lately? I’ve been experimenting with the same.`,
          ],
          s,
          i
        )
      );
    }
  }

  if (starters.length < 2) {
    if (role && company) {
      push(
        pick(
          [
            `${name}, I’d love to hear what you’re prioritizing as ${role} at ${company} this season.`,
            `What’s the most surprising thing you’ve learned on the ${role} path?`,
            `${name}, what would you want someone in my shoes to ask you about ${company}?`,
          ],
          seed,
          10
        )
      );
    } else if (role) {
      push(
        pick(
          [
            `${name}, what’s the part of being ${role} that doesn’t get talked about enough?`,
            `I’d love to hear what you’re focused on in your ${role} world right now.`,
          ],
          seed,
          11
        )
      );
    }
  }

  if (starters.length < 2) {
    if (matchType === "high-affinity") {
      push(
        pick(
          [
            `${name}, sounds like we’d have a lot to compare notes on—what should I ask you about first?`,
            `Excited to connect—${name}, what’s one outcome you’re hoping for from the event?`,
            `${name}, what’s been the best conversation you’ve had here so far?`,
          ],
          seed,
          20
        )
      );
    } else {
      push(
        pick(
          [
            `${name}, I’d value a fresh angle on what I’m building—open to a short virtual coffee?`,
            `Always curious how people in different lanes crack the same leadership problems.`,
            `${name}, what’s one thing you wish more people understood about your work?`,
          ],
          seed,
          21
        )
      );
    }
  }

  let out = starters.slice(0, 3);

  if (viewer && out.length > 0 && seed % 4 !== 0) {
    const first = out[0]!;
    if (!first.toLowerCase().startsWith("hi ") && !first.includes(viewer)) {
      out = [`Hi ${name} — ${viewer} here. ${first.charAt(0).toLowerCase()}${first.slice(1)}`, ...out.slice(1)];
    }
  }

  return out.slice(0, 3);
}
