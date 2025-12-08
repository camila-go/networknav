import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { userMatches } from "@/lib/stores";

// Mark match as viewed
export async function PATCH(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { viewed, passed } = body;

    const matches = userMatches.get(session.userId);
    if (!matches) {
      return NextResponse.json(
        { success: false, error: "No matches found" },
        { status: 404 }
      );
    }

    const matchIndex = matches.findIndex((m) => m.id === params.matchId);
    if (matchIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Match not found" },
        { status: 404 }
      );
    }

    // Update match
    if (typeof viewed === "boolean") {
      matches[matchIndex].viewed = viewed;
    }
    if (typeof passed === "boolean") {
      matches[matchIndex].passed = passed;
    }

    userMatches.set(session.userId, matches);

    return NextResponse.json({
      success: true,
      data: { match: matches[matchIndex] },
    });
  } catch (error) {
    console.error("Update match error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

