import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  isValidReaction,
  setPostReaction,
  clearPostReaction,
  type ReactionKey,
} from "@/lib/stores/explore-reactions-store";

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getSession();
    const deviceId = cookies().get("device_id")?.value;
    const userId = session?.userId || deviceId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Sign in to react" },
        { status: 401 }
      );
    }

    const postId = params.postId;
    const body = await request.json();
    const reaction = body.reaction as string;
    if (!isValidReaction(reaction)) {
      return NextResponse.json(
        { success: false, error: "Invalid reaction" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from("explore_post_reactions")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .maybeSingle();

      const op = existing
        ? supabaseAdmin
            .from("explore_post_reactions")
            .update({ reaction })
            .eq("post_id", postId)
            .eq("user_id", userId)
        : supabaseAdmin.from("explore_post_reactions").insert({
            post_id: postId,
            user_id: userId,
            reaction,
          });

      const { error } = await op;
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, reaction });
    }

    setPostReaction(postId, userId, reaction as ReactionKey);
    return NextResponse.json({ success: true, reaction });
  } catch (e) {
    console.error("[explore/reactions POST]", e);
    return NextResponse.json(
      { success: false, error: "Failed to react" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getSession();
    const deviceId = cookies().get("device_id")?.value;
    const userId = session?.userId || deviceId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Sign in" },
        { status: 401 }
      );
    }

    const postId = params.postId;

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("explore_post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    clearPostReaction(postId, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[explore/reactions DELETE]", e);
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
