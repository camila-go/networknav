/**
 * In-memory poll votes when Supabase is not configured (local dev).
 */

const polls = new Map<string, Map<string, string>>();

export function memorySetNetworkPulseVote(
  pollId: string,
  userId: string,
  optionId: string
): void {
  let m = polls.get(pollId);
  if (!m) {
    m = new Map();
    polls.set(pollId, m);
  }
  m.set(userId, optionId);
}

export function memoryGetNetworkPulseState(
  pollId: string,
  optionIds: string[],
  userId: string | undefined
): { counts: Record<string, number>; userVote: string | null } {
  const counts: Record<string, number> = {};
  for (const id of optionIds) {
    counts[id] = 0;
  }
  const m = polls.get(pollId);
  if (!m) {
    return { counts, userVote: null };
  }
  for (const v of m.values()) {
    if (v in counts) {
      counts[v] += 1;
    }
  }
  const userVote =
    userId && m.has(userId) ? (m.get(userId) ?? null) : null;
  return { counts, userVote };
}
