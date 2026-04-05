/**
 * Network Pulse polls — `pollId` is stored in DB as `network_pulse_votes.poll_id` (capture key).
 */

export type NetworkPulseOption = {
  id: string;
  label: string;
  /** Shown after “Majority:” */
  majorityTag: string;
};

export type NetworkPulsePollDefinition = {
  /** Stored as poll_id / capture key */
  pollId: string;
  question: string;
  options: readonly NetworkPulseOption[];
};

export const NETWORK_PULSE_POLLS: readonly NetworkPulsePollDefinition[] = [
  {
    pollId: "disney_marvel",
    question: "Disney or Marvel or neither?",
    options: [
      { id: "disney", label: "Disney", majorityTag: "DISNEY FANS" },
      { id: "marvel", label: "Marvel", majorityTag: "MARVEL FANS" },
      { id: "neither", label: "Neither", majorityTag: "NEITHER / OTHER" },
    ],
  },
  {
    pollId: "audio_pref",
    question: "Podcasts or music?",
    options: [
      { id: "podcasts", label: "Podcasts", majorityTag: "PODCASTS" },
      { id: "music", label: "Music", majorityTag: "MUSIC" },
    ],
  },
  {
    pollId: "communication_style",
    question: "Text or call?",
    options: [
      { id: "text", label: "Text", majorityTag: "TEXT" },
      { id: "call", label: "Call", majorityTag: "CALL" },
    ],
  },
] as const;

export function getPollDefinition(
  pollId: string
): NetworkPulsePollDefinition | undefined {
  return NETWORK_PULSE_POLLS.find((p) => p.pollId === pollId);
}

export function getAllNetworkPulsePollIds(): string[] {
  return NETWORK_PULSE_POLLS.map((p) => p.pollId);
}

export function isValidNetworkPulseVote(
  pollId: string,
  optionId: string
): boolean {
  const poll = getPollDefinition(pollId);
  return Boolean(poll?.options.some((o) => o.id === optionId));
}

export function optionIdsForPoll(poll: NetworkPulsePollDefinition): string[] {
  return poll.options.map((o) => o.id);
}

/** Tie-break: earlier option in the poll definition wins. */
export function majorityOptionIdForPoll(
  poll: NetworkPulsePollDefinition,
  counts: Record<string, number>
): string {
  let best = poll.options[0].id;
  let max = -1;
  for (const { id } of poll.options) {
    const c = counts[id] ?? 0;
    if (c > max) {
      max = c;
      best = id;
    }
  }
  return best;
}

export function emptyCountsForPoll(
  poll: NetworkPulsePollDefinition
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { id } of poll.options) {
    out[id] = 0;
  }
  return out;
}

export function toPercentagesForPoll(
  poll: NetworkPulsePollDefinition,
  counts: Record<string, number>
): Record<string, number> {
  const ids = optionIdsForPoll(poll);
  const total = ids.reduce((s, id) => s + (counts[id] ?? 0), 0);
  if (total === 0) {
    return emptyCountsForPoll(poll);
  }
  const p: Record<string, number> = {};
  for (const id of ids) {
    p[id] = Math.round(((counts[id] ?? 0) / total) * 100);
  }
  const diff =
    100 - ids.reduce((s, id) => s + p[id], 0);
  p[majorityOptionIdForPoll(poll, counts)] += diff;
  return p;
}

export function majorityTagForOption(
  poll: NetworkPulsePollDefinition,
  optionId: string
): string {
  const o = poll.options.find((x) => x.id === optionId);
  return o?.majorityTag ?? optionId.toUpperCase();
}
