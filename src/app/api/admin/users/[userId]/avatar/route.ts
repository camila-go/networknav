import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { users } from "@/lib/stores";
import {
  avatarStorageKey,
  deleteProfilePhotoObjects,
} from "@/lib/storage/profile-photos";

// DELETE /api/admin/users/[userId]/avatar
//
// Moderator-initiated avatar removal from the users-management page.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 503 }
    );
  }

  const { userId } = await params;

  try {
    const { data: profile, error: lookupError } = await supabaseAdmin
      .from("user_profiles")
      .select("id, photo_url")
      .eq("id", userId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    await deleteProfilePhotoObjects([avatarStorageKey(userId)]);

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("user_profiles")
      .update({ photo_url: null, updated_at: now } as never)
      .eq("id", userId);

    // Also clear on the row keyed by auth user_id (dual-storage rows exist).
    await supabaseAdmin
      .from("user_profiles")
      .update({ photo_url: null, updated_at: now } as never)
      .eq("user_id", userId);

    // Clear the in-memory mirror for dev/demo mode.
    for (const [key, u] of users.entries()) {
      if (u.id === userId) {
        users.set(key, { ...u, photoUrl: undefined, updatedAt: new Date() });
      }
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "content_removed",
      title: "Profile Photo Removed",
      body: "Your profile photo was removed by a moderator. Please upload one that follows community guidelines.",
      data: { contentType: "avatar", contentId: userId },
    } as never);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin avatar remove error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove avatar" },
      { status: 500 }
    );
  }
}
