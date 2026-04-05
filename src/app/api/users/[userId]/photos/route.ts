import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
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

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, data: { photos: [] } });
    }

    const { data, error } = await supabaseAdmin
      .from("user_photos")
      .select("*")
      .eq("user_id", params.userId)
      .order("display_order", { ascending: true });

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
