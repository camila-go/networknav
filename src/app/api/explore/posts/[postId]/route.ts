import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { deleteExplorePost } from "@/lib/stores/explore-posts-store";
import { removePostReactions } from "@/lib/stores/explore-reactions-store";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Sign in to delete posts" },
        { status: 401 }
      );
    }

    const postId = params.postId;
    const userId = session.userId;

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("explore_posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      if (!data) {
        return NextResponse.json(
          { success: false, error: "Post not found or not yours" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    const ok = deleteExplorePost(postId, userId);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Post not found or not yours" },
        { status: 404 }
      );
    }
    removePostReactions(postId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[explore/posts DELETE]", e);
    return NextResponse.json(
      { success: false, error: "Failed to delete" },
      { status: 500 }
    );
  }
}
