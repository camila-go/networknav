import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { deleteExploreReply } from "@/lib/stores/explore-posts-store";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { postId: string; replyId: string } }
) {
  try {
    const session = await getSession();
    const deviceId = cookies().get("device_id")?.value;
    const userId = session?.userId || deviceId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Sign in to delete replies" },
        { status: 401 }
      );
    }

    const { postId, replyId } = params;
    if (!postId || !replyId) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from("explore_post_replies")
        .delete()
        .eq("id", replyId)
        .eq("post_id", postId)
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
          { success: false, error: "Reply not found or not yours" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    const ok = deleteExploreReply(postId, replyId, userId);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: "Reply not found or not yours" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[explore/replies DELETE]", e);
    return NextResponse.json(
      { success: false, error: "Failed to delete reply" },
      { status: 500 }
    );
  }
}
