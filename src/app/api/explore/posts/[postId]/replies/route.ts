import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { resolveExploreAuthors } from "@/lib/explore-resolve-authors";
import { addExploreReply, getExplorePost } from "@/lib/stores/explore-posts-store";

const MAX_REPLY = 1500;

async function enrichReply(row: {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}) {
  const authors = await resolveExploreAuthors([row.user_id]);
  const a = authors.get(row.user_id)!;
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    authorName: a.name,
    authorPhotoUrl: a.photoUrl,
    reactionCounts: {},
    myReaction: null as string | null,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getSession();
    const deviceId = cookies().get("device_id")?.value;
    const userId = session?.userId || deviceId;
    if (!userId) {
      return NextResponse.json({ success: false, error: "Sign in to reply" }, { status: 401 });
    }

    const postId = params.postId;
    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    if (!content || content.length > MAX_REPLY) {
      return NextResponse.json(
        { success: false, error: "Invalid reply" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: post } = await supabaseAdmin
        .from("explore_posts")
        .select("id")
        .eq("id", postId)
        .single();
      if (!post) {
        return NextResponse.json(
          { success: false, error: "Post not found" },
          { status: 404 }
        );
      }
      const { data, error } = await supabaseAdmin
        .from("explore_post_replies")
        .insert({ post_id: postId, user_id: userId, content })
        .select("id, user_id, content, created_at")
        .single();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          data: await enrichReply({
            id: data.id,
            user_id: data.user_id,
            content: data.content,
            created_at: data.created_at,
          }),
        });
      }
      return NextResponse.json(
        { success: false, error: error?.message || "Failed to reply" },
        { status: 500 }
      );
    }

    const p = getExplorePost(postId);
    if (!p) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }
    const reply = addExploreReply(postId, userId, content);
    return NextResponse.json({
      success: true,
      data: await enrichReply({
        id: reply.id,
        user_id: reply.userId,
        content: reply.content,
        created_at: reply.createdAt,
      }),
    });
  } catch (e) {
    console.error("[explore/replies POST]", e);
    return NextResponse.json(
      { success: false, error: "Failed to reply" },
      { status: 500 }
    );
  }
}
