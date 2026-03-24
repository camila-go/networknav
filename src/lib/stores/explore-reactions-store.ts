export const REACTION_KEYS = [
  "heart",
  "thumbs",
  "fire",
  "clap",
  "laugh",
] as const;
export type ReactionKey = (typeof REACTION_KEYS)[number];

export function isValidReaction(r: string): r is ReactionKey {
  return (REACTION_KEYS as readonly string[]).includes(r);
}

/** postId -> userId -> reaction */
const byPost = new Map<string, Map<string, ReactionKey>>();

export type ReactionSummary = {
  counts: Record<string, number>;
  myReaction: ReactionKey | null;
};

export function setPostReaction(
  postId: string,
  userId: string,
  reaction: ReactionKey
): void {
  let m = byPost.get(postId);
  if (!m) {
    m = new Map();
    byPost.set(postId, m);
  }
  m.set(userId, reaction);
}

export function clearPostReaction(postId: string, userId: string): void {
  const m = byPost.get(postId);
  if (!m) return;
  m.delete(userId);
  if (m.size === 0) byPost.delete(postId);
}

export function removePostReactions(postId: string): void {
  byPost.delete(postId);
}

export function summarizeReactions(
  postIds: string[],
  viewerId: string | null
): Map<string, ReactionSummary> {
  const out = new Map<string, ReactionSummary>();
  for (const pid of postIds) {
    const counts: Record<string, number> = {};
    let myReaction: ReactionKey | null = null;
    const m = byPost.get(pid);
    if (m) {
      for (const [uid, r] of m) {
        counts[r] = (counts[r] || 0) + 1;
        if (viewerId && uid === viewerId) myReaction = r;
      }
    }
    out.set(pid, { counts, myReaction });
  }
  return out;
}

/** replyId -> userId -> reaction */
const byReply = new Map<string, Map<string, ReactionKey>>();

export function setReplyReaction(
  replyId: string,
  userId: string,
  reaction: ReactionKey
): void {
  let m = byReply.get(replyId);
  if (!m) {
    m = new Map();
    byReply.set(replyId, m);
  }
  m.set(userId, reaction);
}

export function clearReplyReaction(replyId: string, userId: string): void {
  const m = byReply.get(replyId);
  if (!m) return;
  m.delete(userId);
  if (m.size === 0) byReply.delete(replyId);
}

export function removeReplyReactions(replyId: string): void {
  byReply.delete(replyId);
}

export function removeReplyReactionsMany(replyIds: string[]): void {
  for (const id of replyIds) byReply.delete(id);
}

export function summarizeReplyReactions(
  replyIds: string[],
  viewerId: string | null
): Map<string, ReactionSummary> {
  const out = new Map<string, ReactionSummary>();
  for (const rid of replyIds) {
    const counts: Record<string, number> = {};
    let myReaction: ReactionKey | null = null;
    const m = byReply.get(rid);
    if (m) {
      for (const [uid, r] of m) {
        counts[r] = (counts[r] || 0) + 1;
        if (viewerId && uid === viewerId) myReaction = r;
      }
    }
    out.set(rid, { counts, myReaction });
  }
  return out;
}

