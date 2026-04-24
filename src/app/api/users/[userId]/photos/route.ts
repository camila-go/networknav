import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/client";
import type { UserPhoto, UserPhotoStatus } from "@/types";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, data: { photos: [] } });
    }

    // Own profile can see all statuses (they need to see their own pending
    // photos with the "Pending approval" badge); other viewers only see approved.
    const session = await getSession();
    const isOwner = session?.userId === params.userId;

    let query = supabaseAdmin
      .from("user_photos")
      .select("*")
      .eq("user_id", params.userId)
      .order("display_order", { ascending: true });

    if (!isOwner) {
      query = query.eq("status", "approved");
    }

    const { data, error } = await query;

    if (error) {
      console.error("User photos fetch error:", error);
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
    console.error("User photos fetch error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
