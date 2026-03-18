import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { checkRateLimit } from "@/lib/security/rateLimit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_PHOTOS = 12;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { allowed } = await checkRateLimit(session.userId, "upload-gallery-photo");
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many uploads. Please try again later." },
        { status: 429 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Storage not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { fileType, fileSize } = body as { fileType: string; fileSize: number };

    if (!fileType || !fileSize) {
      return NextResponse.json(
        { success: false, error: "fileType and fileSize are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    // Check current photo count
    const { count, error: countError } = await supabaseAdmin
      .from("user_photos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.userId);

    if (countError) {
      console.error("Photo count error:", countError);
      return NextResponse.json(
        { success: false, error: "Failed to check photo limit" },
        { status: 500 }
      );
    }

    if ((count ?? 0) >= MAX_PHOTOS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_PHOTOS} gallery photos allowed` },
        { status: 400 }
      );
    }

    const photoId = crypto.randomUUID();
    const storageKey = `${session.userId}/gallery/${photoId}`;

    const { data, error } = await supabaseAdmin.storage
      .from("profile-photos")
      .createSignedUploadUrl(storageKey);

    if (error || !data) {
      console.error("Signed URL error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to generate upload URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        token: data.token,
        storageKey,
        photoId,
      },
    });
  } catch (error) {
    console.error("Gallery upload-url error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
