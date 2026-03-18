import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users } from "@/lib/stores";
import { supabaseAdmin } from "@/lib/supabase/client";
import { checkRateLimit } from "@/lib/security/rateLimit";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB (below Vercel's ~4.5 MB serverless body limit)

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 4 MB." },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Storage not configured" },
        { status: 503 }
      );
    }

    const storageKey = `${session.userId}/avatar`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("profile-photos")
      .upload(storageKey, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, error: "Failed to upload image" },
        { status: 500 }
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

    // Persist to Supabase
    try {
      await supabaseAdmin
        .from("user_profiles")
        .update({
          photo_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.userId);
    } catch (err) {
      console.error("Supabase avatar URL sync error:", err);
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      data: { photoUrl: publicUrl },
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
