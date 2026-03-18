export interface ExploreReply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface ExplorePostRecord {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  imageUrls: string[];
  replies: ExploreReply[];
}

const posts: ExplorePostRecord[] = [];

export function addExplorePost(
  userId: string,
  content: string,
  imageUrls: string[] = []
): ExplorePostRecord {
  const record: ExplorePostRecord = {
    id: crypto.randomUUID(),
    userId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
    imageUrls: imageUrls.filter(Boolean).slice(0, 6),
    replies: [],
  };
  posts.unshift(record);
  return record;
}

export function getExplorePost(id: string): ExplorePostRecord | null {
  return posts.find((p) => p.id === id) ?? null;
}

export function addExploreReply(
  postId: string,
  userId: string,
  content: string
): ExploreReply | null {
  const p = posts.find((x) => x.id === postId);
  if (!p) return null;
  const r: ExploreReply = {
    id: crypto.randomUUID(),
    userId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  p.replies.push(r);
  return r;
}

export function listExplorePosts(limit = 50): ExplorePostRecord[] {
  return posts.slice(0, limit);
}

export function deleteExplorePost(
  postId: string,
  userId: string
): boolean {
  const i = posts.findIndex((p) => p.id === postId && p.userId === userId);
  if (i === -1) return false;
  posts.splice(i, 1);
  return true;
}

export function deleteExploreReply(
  postId: string,
  replyId: string,
  userId: string
): boolean {
  const p = posts.find((x) => x.id === postId);
  if (!p) return false;
  const i = p.replies.findIndex(
    (r) => r.id === replyId && r.userId === userId
  );
  if (i === -1) return false;
  p.replies.splice(i, 1);
  return true;
}
