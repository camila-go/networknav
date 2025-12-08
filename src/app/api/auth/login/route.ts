import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import {
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { users } from "@/lib/stores";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = loginSchema.safeParse(body);
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

    const { email, password } = result.data;

    // Find user
    const user = users.get(email.toLowerCase());
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // Create tokens
    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
    });
    const refreshToken = await createRefreshToken({ userId: user.id });

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    // Return user data
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
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

