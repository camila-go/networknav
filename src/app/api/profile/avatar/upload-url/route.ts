import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { checkRateLimit } from "@/lib/security/rateLimit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { allowed } = await checkRateLimit(session.userId, "upload-avatar");
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

    const storageKey = `${session.userId}/avatar`;

    // Delete existing avatar for upsert behavior
    await supabaseAdmin.storage.from("profile-photos").remove([storageKey]);

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
      },
    });
  } catch (error) {
    console.error("Avatar upload-url error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
