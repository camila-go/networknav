import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import type { UserPhoto } from "@/types";

const MAX_PHOTOS = 12;

function rowToUserPhoto(row: {
  id: string;
  user_id: string;
  storage_key: string;
  url: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}): UserPhoto {
  return {
    id: row.id,
    userId: row.user_id,
    storageKey: row.storage_key,
    url: row.url,
    caption: row.caption ?? undefined,
    displayOrder: row.display_order,
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
    const { storageKey, photoId, caption } = body as {
      storageKey: string;
      photoId: string;
      caption?: string;
    };

    if (!storageKey || !photoId) {
      return NextResponse.json(
        { success: false, error: "storageKey and photoId are required" },
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

    if ((count ?? 0) >= MAX_PHOTOS) {
      // Clean up the orphaned storage file
      await supabaseAdmin.storage.from("profile-photos").remove([storageKey]);
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_PHOTOS} gallery photos allowed` },
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
        display_order: nextOrder,
      })
      .select("*")
      .single();

    if (insertError || !newPhoto) {
      console.error("Photo insert error:", insertError);
      // Clean up storage on insert failure
      await supabaseAdmin.storage.from("profile-photos").remove([storageKey]);
      return NextResponse.json(
        { success: false, error: "Failed to save photo" },
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
