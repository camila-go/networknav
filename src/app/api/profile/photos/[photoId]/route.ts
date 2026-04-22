import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import { normalizeActivityTag } from "@/lib/profile/activity-tag";
import type { UserPhoto } from "@/types";

function rowToUserPhoto(row: {
  id: string;
  user_id: string;
  storage_key: string;
  url: string;
  caption: string | null;
  activity_tag?: string | null;
  display_order: number;
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
    createdAt: new Date(row.created_at),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { photoId: string } }
) {
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
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const updates: {
      caption?: string | null;
      display_order?: number;
      activity_tag?: string | null;
    } = {};

    if ("caption" in body) updates.caption = body.caption ?? null;
    if ("displayOrder" in body) updates.display_order = body.displayOrder;
    if ("activityTag" in body) {
      const n = normalizeActivityTag(body.activityTag ?? null);
      if (n === null) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Activity label is required. Use a short label (e.g. kayaking) so your photo can be shared on the community gallery.",
          },
          { status: 400 }
        );
      }
      updates.activity_tag = n;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("user_photos")
      .update(updates)
      .eq("id", params.photoId)
      .eq("user_id", session.userId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: "Photo not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { photo: rowToUserPhoto(data) },
    });
  } catch (error) {
    console.error("Photo update error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { photoId: string } }
) {
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
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Fetch photo to get storage key and verify ownership
    const { data: photo, error: fetchError } = await supabaseAdmin
      .from("user_photos")
      .select("storage_key")
      .eq("id", params.photoId)
      .eq("user_id", session.userId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { success: false, error: "Photo not found" },
        { status: 404 }
      );
    }

    // Delete from Storage
    await supabaseAdmin.storage
      .from("profile-photos")
      .remove([photo.storage_key]);

    // Delete DB row
    await supabaseAdmin
      .from("user_photos")
      .delete()
      .eq("id", params.photoId)
      .eq("user_id", session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Photo delete error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
