import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  isValidReaction,
  setReplyReaction,
  clearReplyReaction,
  type ReactionKey,
} from "@/lib/stores/explore-reactions-store";
import { exploreReplyExists } from "@/lib/stores/explore-posts-store";

export async function POST(
  request: NextRequest,
  { params }: { params: { replyId: string } }
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

    const replyId = params.replyId;
    const body = await request.json();
    const reaction = body.reaction as string;
    if (!isValidReaction(reaction)) {
      return NextResponse.json(
        { success: false, error: "Invalid reaction" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: reply, error: findErr } = await supabaseAdmin
        .from("explore_post_replies")
        .select("id")
        .eq("id", replyId)
        .maybeSingle();

      if (findErr || !reply) {
        return NextResponse.json(
          { success: false, error: "Reply not found" },
          { status: 404 }
        );
      }

      const { data: existing } = await supabaseAdmin
        .from("explore_reply_reactions")
        .select("reply_id")
        .eq("reply_id", replyId)
        .eq("user_id", userId)
        .maybeSingle();

      const op = existing
        ? supabaseAdmin
            .from("explore_reply_reactions")
            .update({ reaction })
            .eq("reply_id", replyId)
            .eq("user_id", userId)
        : supabaseAdmin.from("explore_reply_reactions").insert({
            reply_id: replyId,
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

    if (!exploreReplyExists(replyId)) {
      return NextResponse.json(
        { success: false, error: "Reply not found" },
        { status: 404 }
      );
    }

    setReplyReaction(replyId, userId, reaction as ReactionKey);
    return NextResponse.json({ success: true, reaction });
  } catch (e) {
    console.error("[explore/reply-reactions POST]", e);
    return NextResponse.json(
      { success: false, error: "Failed to react" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { replyId: string } }
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

    const replyId = params.replyId;

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from("explore_reply_reactions")
        .delete()
        .eq("reply_id", replyId)
        .eq("user_id", userId);

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    clearReplyReaction(replyId, userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[explore/reply-reactions DELETE]", e);
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
