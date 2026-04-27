import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users } from "@/lib/stores";
import { supabaseAdmin } from "@/lib/supabase/client";
import { syncUserProfilePhotoUrlAcrossRows } from "@/lib/profile/profile-photo-url";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Storage not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { storageKey } = body as { storageKey: string };

    if (!storageKey) {
      return NextResponse.json(
        { success: false, error: "storageKey is required" },
        { status: 400 }
      );
    }

    // Validate storage key matches the authenticated user
    const expectedKey = `${session.userId}/avatar`;
    if (storageKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: "Invalid storage key" },
        { status: 403 }
      );
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("profile-photos")
      .getPublicUrl(storageKey);

    // Update in-memory store
    const user = users.get(session.email);
    if (user) {
      user.photoUrl = publicUrl;
      user.updatedAt = new Date();
      users.set(session.email, user);
    }

    try {
      await syncUserProfilePhotoUrlAcrossRows(supabaseAdmin, session.userId, publicUrl);
    } catch (err) {
      console.error("Supabase avatar URL sync error:", err);
    }

    return NextResponse.json({
      success: true,
      data: { photoUrl: publicUrl },
    });
  } catch (error) {
    console.error("Avatar confirm error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
