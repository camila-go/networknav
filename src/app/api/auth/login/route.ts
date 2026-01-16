import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import {
  verifyPassword,
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth";
import { users } from "@/lib/stores";
import { checkRateLimit } from "@/lib/security/rateLimit";

// Rate limit for login: 5 attempts per 15 minutes per IP
const LOGIN_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting (use forwarded IP in production)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";
    
    // Check rate limit before processing
    const rateLimitResult = await checkRateLimit(
      `login:${ip}`,
      "login",
      LOGIN_RATE_LIMIT.maxRequests,
      LOGIN_RATE_LIMIT.windowMs
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again later.",
          retryAfter: rateLimitResult.resetTime 
            ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            : 900,
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.resetTime 
              ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
              : 900),
          },
        }
      );
    }

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

    // Create response with user data
    const response = NextResponse.json({
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

    // Set cookies on the response (must match auth.ts cookie names)
    response.cookies.set("auth_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
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

