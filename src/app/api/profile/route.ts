import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { profileSchema } from "@/lib/validations";
import { users } from "@/lib/stores";
import { supabaseAdmin } from "@/lib/supabase/client";

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
    if (location !== undefined) user.location = location;
    if (photoUrl !== undefined) user.photoUrl = photoUrl;
    user.updatedAt = new Date();

    users.set(session.email, user);

    // Persist to Supabase if configured
    if (supabaseAdmin) {
      try {
        await supabaseAdmin
          .from("user_profiles")
          .update({
            name,
            position,
            title,
            company,
            location: location ?? null,
            photo_url: photoUrl ?? null,
            updated_at: user.updatedAt.toISOString(),
          })
          .eq("user_id", user.id);
      } catch (err) {
        console.error("Supabase profile sync error:", err);
        // Non-blocking — in-memory update already succeeded
      }
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
            location: user.location,
            photoUrl: user.photoUrl,
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

