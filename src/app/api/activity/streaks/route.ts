import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { calculateStreakStatus, freezeStreak } from "@/lib/gamification/streaks";

// ============================================
// GET - Get current streak status
// ============================================

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const streakStatus = await calculateStreakStatus(session.userId);

    return NextResponse.json(streakStatus);
  } catch (error) {
    console.error("[Streaks API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch streak status" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Freeze streak (use grace period)
// ============================================

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body as { action: "freeze" };

    if (action !== "freeze") {
      return NextResponse.json(
        { error: "Invalid action. Only 'freeze' is supported." },
        { status: 400 }
      );
    }

    const result = await freezeStreak(session.userId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Return updated streak status
    const streakStatus = await calculateStreakStatus(session.userId);

    return NextResponse.json({
      message: result.message,
      streaks: streakStatus,
    });
  } catch (error) {
    console.error("[Streaks API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to freeze streak" },
      { status: 500 }
    );
  }
}
