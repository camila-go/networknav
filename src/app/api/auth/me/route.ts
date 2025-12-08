import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users } from "@/lib/stores";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // Find user by email
    const user = users.get(session.email);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          profile: {
            name: user.name,
            position: user.position,
            title: user.title,
            company: user.company,
          },
          questionnaireCompleted: user.questionnaireCompleted,
        },
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

