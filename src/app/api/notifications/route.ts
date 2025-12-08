import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  getPreferences,
  updatePreferences,
} from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "preferences") {
      const preferences = getPreferences(session.userId);
      return NextResponse.json({
        success: true,
        data: { preferences },
      });
    }

    if (type === "count") {
      const count = getUnreadCount(session.userId);
      return NextResponse.json({
        success: true,
        data: { unreadCount: count },
      });
    }

    // Default: return all notifications
    const notifications = getNotifications(session.userId);
    const unreadCount = getUnreadCount(session.userId);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, preferences } = body;

    if (action === "markAllRead") {
      const count = markAllAsRead(session.userId);
      return NextResponse.json({
        success: true,
        data: { markedCount: count },
        message: `Marked ${count} notifications as read`,
      });
    }

    if (action === "updatePreferences" && preferences) {
      const updated = updatePreferences(session.userId, preferences);
      return NextResponse.json({
        success: true,
        data: { preferences: updated },
        message: "Preferences updated",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update notifications error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

