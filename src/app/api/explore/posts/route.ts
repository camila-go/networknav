import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { resolveExploreAuthors } from "@/lib/explore-resolve-authors";
import {
  addExplorePost,
  listExplorePosts,
} from "@/lib/stores/explore-posts-store";
import {
  summarizeReactions,
  summarizeReplyReactions,
} from "@/lib/stores/explore-reactions-store";
import type { AuthorInfo } from "@/lib/explore-resolve-authors";

const MAX_CONTENT = 2000;
const MAX_IMAGES = 6;

type RxSummary = { counts: Record<string, number>; myReaction: string | null };

async function loadReactionSummaries(
  postIds: string[],
  viewerId: string | null
): Promise<Map<string, RxSummary>> {
  const map = new Map<string, RxSummary>();
  for (const id of postIds) {
    map.set(id, { counts: {}, myReaction: null });
  }
  if (postIds.length === 0) return map;

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("explore_post_reactions")
      .select("post_id, user_id, reaction")
      .in("post_id", postIds);

    if (!error && data) {
      for (const row of data) {
        const pid = row.post_id as string;
        const s = map.get(pid);
        if (!s) continue;
        const r = row.reaction as string;
        s.counts[r] = (s.counts[r] || 0) + 1;
        if (viewerId && row.user_id === viewerId) s.myReaction = r;
      }
    }
    return map;
  }

  const mem = summarizeReactions(postIds, viewerId);
  for (const id of postIds) {
    const s = mem.get(id)!;
    map.set(id, { counts: { ...s.counts }, myReaction: s.myReaction });
  }
  return map;
}

async function loadReplyReactionSummaries(
  replyIds: string[],
  viewerId: string | null
): Promise<Map<string, RxSummary>> {
  const map = new Map<string, RxSummary>();
  for (const id of replyIds) {
    map.set(id, { counts: {}, myReaction: null });
  }
  if (replyIds.length === 0) return map;

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("explore_reply_reactions")
      .select("reply_id, user_id, reaction")
      .in("reply_id", replyIds);

    if (!error && data) {
      for (const row of data) {
        const rid = row.reply_id as string;
        const s = map.get(rid);
        if (!s) continue;
        const r = row.reaction as string;
        s.counts[r] = (s.counts[r] || 0) + 1;
        if (viewerId && row.user_id === viewerId) s.myReaction = r;
      }
    }
    return map;
  }

  const mem = summarizeReplyReactions(replyIds, viewerId);
  for (const id of replyIds) {
    const s = mem.get(id)!;
    map.set(id, { counts: { ...s.counts }, myReaction: s.myReaction });
  }
  return map;
}

function enrichPost(
  row: {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    image_urls?: unknown;
  },
  replies: Array<{
    id: string;
    user_id: string;
    content: string;
    created_at: string;
  }>,
  authors: Map<string, AuthorInfo>,
  rx: RxSummary,
  replyRx: Map<string, RxSummary>
) {
  const author = authors.get(row.user_id) ?? {
    name: "Member",
    email: null,
    photoUrl: null,
  };
  const urls = Array.isArray(row.image_urls)
    ? (row.image_urls as string[]).filter((x) => typeof x === "string")
    : typeof row.image_urls === "string"
      ? JSON.parse(row.image_urls || "[]")
      : [];

  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    imageUrls: urls.slice(0, MAX_IMAGES),
    authorName: author.name,
    authorEmail: author.email,
    authorPhotoUrl: author.photoUrl,
    reactionCounts: rx.counts,
    myReaction: rx.myReaction,
    replies: replies.map((r) => {
      const ra = authors.get(r.user_id) ?? {
        name: "Member",
        email: null,
        photoUrl: null,
      };
      const rsum = replyRx.get(r.id) ?? { counts: {}, myReaction: null };
      return {
        id: r.id,
        userId: r.user_id,
        content: r.content,
        createdAt: r.created_at,
        authorName: ra.name,
        authorPhotoUrl: ra.photoUrl,
        reactionCounts: rsum.counts,
        myReaction: rsum.myReaction,
      };
    }),
  };
}

export async function GET() {
  try {
    const session = await getSession();
    const deviceId = cookies().get("device_id")?.value;
    const viewerId = session?.userId || deviceId || null;

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("explore_posts")
        .select("id, user_id, content, created_at, image_urls")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        if (data.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
            viewerId,
          });
        }
        const ids = data.map((p) => p.id);
        const { data: replyRows, error: replyErr } = await supabaseAdmin
          .from("explore_post_replies")
          .select("id, post_id, user_id, content, created_at")
          .in("post_id", ids)
          .order("created_at", { ascending: true });

        if (replyErr) {
          console.warn("[explore/posts] replies load:", replyErr.message);
        }

        const byPost = new Map<
          string,
          Array<{
            id: string;
            user_id: string;
            content: string;
            created_at: string;
          }>
        >();
        for (const r of replyErr ? [] : replyRows || []) {
          const pid = r.post_id as string;
          if (!byPost.has(pid)) byPost.set(pid, []);
          byPost.get(pid)!.push({
            id: r.id,
            user_id: r.user_id,
            content: r.content,
            created_at: r.created_at,
          });
        }

        const authorIds = new Set<string>();
        for (const row of data) authorIds.add(row.user_id);
        for (const r of replyErr ? [] : replyRows || []) {
          authorIds.add(r.user_id as string);
        }
        const authors = await resolveExploreAuthors([...authorIds]);
        const rxMap = await loadReactionSummaries(ids, viewerId);
        const allReplyIds: string[] = [];
        for (const arr of byPost.values()) {
          for (const r of arr) allReplyIds.push(r.id);
        }
        const replyRxMap = await loadReplyReactionSummaries(
          allReplyIds,
          viewerId
        );

        return NextResponse.json({
          success: true,
          viewerId,
          data: data.map((row) =>
            enrichPost(
              {
                id: row.id,
                user_id: row.user_id,
                content: row.content,
                created_at: row.created_at,
                image_urls: row.image_urls,
              },
              byPost.get(row.id) || [],
              authors,
              rxMap.get(row.id) ?? { counts: {}, myReaction: null },
              replyRxMap
            )
          ),
        });
      }
    }

    const list = listExplorePosts(100);
    const authorIds = new Set<string>();
    for (const r of list) {
      authorIds.add(r.userId);
      for (const rep of r.replies) authorIds.add(rep.userId);
    }
    const authors = await resolveExploreAuthors([...authorIds]);
    const pids = list.map((p) => p.id);
    const rxMap = await loadReactionSummaries(pids, viewerId);
    const allReplyIds: string[] = [];
    for (const p of list) {
      for (const rep of p.replies) allReplyIds.push(rep.id);
    }
    const replyRxMap = await loadReplyReactionSummaries(allReplyIds, viewerId);

    return NextResponse.json({
      success: true,
      viewerId,
      data: list.map((r) =>
        enrichPost(
          {
            id: r.id,
            user_id: r.userId,
            content: r.content,
            created_at: r.createdAt,
            image_urls: r.imageUrls,
          },
          r.replies.map((rep) => ({
            id: rep.id,
            user_id: rep.userId,
            content: rep.content,
            created_at: rep.createdAt,
          })),
          authors,
          rxMap.get(r.id) ?? { counts: {}, myReaction: null },
          replyRxMap
        )
      ),
    });
  } catch (e) {
    console.error("[explore/posts GET]", e);
    return NextResponse.json(
      { success: false, error: "Failed to load posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const deviceId = cookies().get("device_id")?.value;
    const userId = session?.userId || deviceId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Sign in to post" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const rawUrls = Array.isArray(body.imageUrls) ? body.imageUrls : [];
    const imageUrls = rawUrls
      .filter((u: unknown) => typeof u === "string" && u.length > 0)
      .slice(0, MAX_IMAGES);

    if (!content || content.length > MAX_CONTENT) {
      return NextResponse.json(
        { success: false, error: "Invalid post content" },
        { status: 400 }
      );
    }

    const authors = await resolveExploreAuthors([userId]);
    const emptyRx: RxSummary = { counts: {}, myReaction: null };

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("explore_posts")
        .insert({
          user_id: userId,
          content,
          image_urls: imageUrls,
        })
        .select("id, user_id, content, created_at, image_urls")
        .single();

      if (!error && data) {
        const emptyReplyRx = new Map<string, RxSummary>();
        return NextResponse.json({
          success: true,
          data: enrichPost(
            {
              id: data.id,
              user_id: data.user_id,
              content: data.content,
              created_at: data.created_at,
              image_urls: data.image_urls,
            },
            [],
            authors,
            emptyRx,
            emptyReplyRx
          ),
        });
      }
    }

    const record = addExplorePost(userId, content, imageUrls);
    const emptyReplyRx = new Map<string, RxSummary>();
    return NextResponse.json({
      success: true,
      data: enrichPost(
        {
          id: record.id,
          user_id: record.userId,
          content: record.content,
          created_at: record.createdAt,
          image_urls: record.imageUrls,
        },
        [],
        authors,
        emptyRx,
        emptyReplyRx
      ),
    });
  } catch (e) {
    console.error("[explore/posts POST]", e);
    return NextResponse.json(
      { success: false, error: "Failed to create post" },
      { status: 500 }
    );
  }
}
