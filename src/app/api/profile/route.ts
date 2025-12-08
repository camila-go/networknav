import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { profileSchema } from "@/lib/validations";
import { users } from "@/lib/stores";

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

    // Validate input
    const result = profileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, position, title, company, location, photoUrl } = result.data;

    // Find and update user
    const user = users.get(session.email);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    user.name = name;
    user.position = position;
    user.title = title;
    user.company = company;
    // Note: location and photoUrl would need to be added to the user schema
    user.updatedAt = new Date();

    users.set(session.email, user);

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
        },
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

