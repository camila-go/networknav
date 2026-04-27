import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { normalizeActivityTag } from "@/lib/profile/activity-tag";
import { addToModerationQueue } from "@/lib/moderation/queue";
import type { UserPhoto, UserPhotoStatus } from "@/types";
import { MAX_PROFILE_GALLERY_PHOTOS } from "@/lib/profile-gallery";

function rowToUserPhoto(row: {
  id: string;
  user_id: string;
  storage_key: string;
  url: string;
  caption: string | null;
  activity_tag?: string | null;
  display_order: number;
  status?: UserPhotoStatus | null;
  created_at: string;
}): UserPhoto {
  return {
    id: row.id,
    userId: row.user_id,
    storageKey: row.storage_key,
    url: row.url,
    caption: row.caption ?? undefined,
    activityTag: row.activity_tag ?? undefined,
    displayOrder: row.display_order,
    status: (row.status as UserPhotoStatus | undefined) ?? "approved",
    createdAt: new Date(row.created_at),
  };
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, data: { photos: [] } });
    }

    const { data, error } = await supabaseAdmin
      .from("user_photos")
      .select("*")
      .eq("user_id", session.userId)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Gallery fetch error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch photos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { photos: (data ?? []).map(rowToUserPhoto) },
    });
  } catch (error) {
    console.error("Gallery fetch error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

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
    const { storageKey, photoId, caption, activityTag } = body as {
      storageKey: string;
      photoId: string;
      caption?: string;
      /** Required — normalized and stored; drives gallery & search. */
      activityTag?: string;
    };

    if (!storageKey || !photoId) {
      return NextResponse.json(
        { success: false, error: "storageKey and photoId are required" },
        { status: 400 }
      );
    }

    const normalizedTag = normalizeActivityTag(
      typeof activityTag === "string" ? activityTag : null
    );
    if (!normalizedTag) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Activity label is required for each photo. Add a short label (e.g. kayaking) before saving.",
        },
        { status: 400 }
      );
    }

    // Validate storage key matches the authenticated user
    const expectedKey = `${session.userId}/gallery/${photoId}`;
    if (storageKey !== expectedKey) {
      return NextResponse.json(
        { success: false, error: "Invalid storage key" },
        { status: 403 }
      );
    }

    // Re-check photo count (defense against race conditions)
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

    if ((count ?? 0) >= MAX_PROFILE_GALLERY_PHOTOS) {
      // Clean up the orphaned storage file
      await supabaseAdmin.storage.from("profile-photos").remove([storageKey]);
      return NextResponse.json(
        {
          success: false,
          error: `Maximum ${MAX_PROFILE_GALLERY_PHOTOS} gallery photos allowed`,
        },
        { status: 400 }
      );
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from("profile-photos")
      .getPublicUrl(storageKey);

    // Get next display order
    const { data: maxOrderData } = await supabaseAdmin
      .from("user_photos")
      .select("display_order")
      .eq("user_id", session.userId)
      .order("display_order", { ascending: false })
      .limit(1);

    const nextOrder = maxOrderData && maxOrderData.length > 0
      ? maxOrderData[0].display_order + 1
      : 0;

    const { data: newPhoto, error: insertError } = await supabaseAdmin
      .from("user_photos")
      .insert({
        id: photoId,
        user_id: session.userId,
        storage_key: storageKey,
        url: publicUrl,
        caption: caption ?? null,
        activity_tag: normalizedTag,
        display_order: nextOrder,
        status: "pending",
      })
      .select("*")
      .single();

    if (insertError || !newPhoto) {
      console.error("Photo insert error:", insertError);
      await supabaseAdmin.storage.from("profile-photos").remove([storageKey]);

      const err = insertError as { code?: string; message?: string } | undefined;
      const code = err?.code;
      const hint =
        code === "23503"
          ? "Database rejected this photo (user profile or table missing). Run migrations and ensure you registered with Supabase."
          : code === "42703"
            ? "Database is missing expected columns (e.g. activity_tag). Apply latest migrations."
            : err?.message?.trim() || "Failed to save photo";

      const status = code === "23503" || code === "42703" ? 400 : 500;
      return NextResponse.json({ success: false, error: hint }, { status });
    }

    // Queue for admin review — gallery photos stay hidden from the community until approved.
    // Awaited so a lost queue insert (e.g. serverless runtime freeze) can't strand the photo
    // as orphaned-pending forever. On failure, roll back user_photos + storage so the user retries.
    try {
      await addToModerationQueue({
        contentType: "photo",
        contentId: newPhoto.id as string,
        userId: session.userId,
        contentSnapshot: caption?.trim() || normalizedTag,
        imageUrl: publicUrl,
        reason: "manual_review",
      });
    } catch (err) {
      console.error("Failed to enqueue photo for moderation:", err);
      await supabaseAdmin.from("user_photos").delete().eq("id", newPhoto.id);
      await supabaseAdmin.storage.from("profile-photos").remove([storageKey]);
      return NextResponse.json(
        { success: false, error: "Upload could not be queued for review. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { photo: rowToUserPhoto(newPhoto) },
    });
  } catch (error) {
    console.error("Gallery confirm error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
