import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users } from "@/lib/stores";
import { supabaseAdmin } from "@/lib/supabase/client";
import { syncUserProfilePhotoUrlAcrossRows } from "@/lib/profile/profile-photo-url";
import {
  PROFILE_PHOTOS_BUCKET,
  deleteUserAvatarObjects,
  isAvatarKeyForUser,
} from "@/lib/storage/profile-photos";

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

    // Accept any avatar variant (legacy `${userId}/avatar` or versioned
    // `${userId}/avatar-{ts}.{ext}`) so partial-upload retries can confirm against
    // the same key the upload-url step issued.
    if (!isAvatarKeyForUser(session.userId, storageKey)) {
      return NextResponse.json(
        { success: false, error: "Invalid storage key" },
        { status: 403 }
      );
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(storageKey);

    // Persist the new URL FIRST. If the DB write fails we surface the error and
    // skip orphan cleanup so the previous (good) avatar object is still reachable
    // via the existing photo_url.
    try {
      await syncUserProfilePhotoUrlAcrossRows(
        supabaseAdmin,
        session.userId,
        publicUrl
      );
    } catch (err) {
      console.error("Supabase avatar URL sync error:", err);
      return NextResponse.json(
        {
          success: false,
          error: "Could not save photo. Please try again.",
        },
        { status: 500 }
      );
    }

    // Mirror to in-memory store (dev/demo mode) only after the DB write succeeded.
    const user = users.get(session.email);
    if (user) {
      user.photoUrl = publicUrl;
      user.updatedAt = new Date();
      users.set(session.email, user);
    }

    // Best-effort cleanup of older avatar variants now that the new one is live.
    // Failures here are logged inside the helper and never bubble up.
    try {
      await deleteUserAvatarObjects(session.userId, storageKey);
    } catch (err) {
      console.warn("Avatar orphan cleanup failed (non-fatal):", err);
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
