import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import {
  hashPassword,
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth";
import { users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { checkRateLimit } from "@/lib/security/rateLimit";

// Rate limit for registration: 3 accounts per hour per IP
const REGISTER_RATE_LIMIT = { maxRequests: 3, windowMs: 60 * 60 * 1000 };

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || request.headers.get("x-real-ip") 
      || "unknown";
    
    // Check rate limit before processing
    const rateLimitResult = await checkRateLimit(
      `register:${ip}`,
      "register",
      REGISTER_RATE_LIMIT.maxRequests,
      REGISTER_RATE_LIMIT.windowMs
    );
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many registration attempts. Please try again later.",
          retryAfter: rateLimitResult.resetTime 
            ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
            : 3600,
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.resetTime 
              ? Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
              : 3600),
          },
        }
      );
    }

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
    
    console.log('📝 Registration attempt:', { email, name, position, title, company });

    // Check if user already exists in memory
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
      role: 'user' as const,
      name,
      position,
      title,
      company,
      questionnaireCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Supabase - REQUIRED for production (credentials must persist)
    if (isSupabaseConfigured && supabaseAdmin) {
      // Check if user already exists in Supabase
      const { data: existingUser } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email already exists",
          },
          { status: 409 }
        );
      }

      const profileData = {
        id: userId,
        user_id: userId,
        email: email.toLowerCase(),
        password_hash: passwordHash,
        name,
        position,
        title,
        company,
        questionnaire_completed: false,
        is_active: true,
        is_visible: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };
      
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .insert(profileData as never);
      
      if (error) {
        console.error('❌ Supabase save error:', error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to create account. Please try again.",
          },
          { status: 500 }
        );
      }
      
      console.log('✅ User registered in Supabase:', email, 'ID:', userId);
    } else {
      // Supabase not configured - fail in production
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Supabase not configured - cannot register users in production');
        return NextResponse.json(
          {
            success: false,
            error: "Registration is currently unavailable. Please try again later.",
          },
          { status: 503 }
        );
      }
    }

    // Also save to in-memory store (for session caching)
    users.set(email.toLowerCase(), user);

    // Create tokens
    const accessToken = await createAccessToken({ userId, email: user.email, role: 'user' });
    const refreshToken = await createRefreshToken({ userId });

    // Create response with user data
    const response = NextResponse.json(
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


