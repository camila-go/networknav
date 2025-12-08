import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import {
  hashPassword,
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
} from "@/lib/auth";
import { users } from "@/lib/stores";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
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

    const { email, password, name, position, title, company } = result.data;

    // Check if user already exists
    if (users.has(email.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists",
        },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = crypto.randomUUID();
    const now = new Date();
    const user = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash,
      name,
      position,
      title,
      company,
      questionnaireCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    users.set(email.toLowerCase(), user);

    // Create tokens
    const accessToken = await createAccessToken({ userId, email: user.email });
    const refreshToken = await createRefreshToken({ userId });

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    // Return user data (without sensitive info)
    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}


