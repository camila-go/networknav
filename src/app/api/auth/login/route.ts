import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations";
import {
  verifyPassword,
  createAccessToken,
  createRefreshToken,
} from "@/lib/auth";
import { users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { checkRateLimit } from "@/lib/security/rateLimit";

// Rate limit for login: 5 attempts per 15 minutes per IP
const LOGIN_RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 };

// Helper to find user from Supabase and add to memory store
async function findUserFromSupabase(email: string): Promise<{
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  position: string;
  title: string;
  company: string;
  questionnaireCompleted: boolean;
  questionnaireData?: Record<string, unknown>;
} | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;
  
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, password_hash, name, position, title, company, questionnaire_completed, questionnaire_data')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !profile) {
      console.log('Supabase profile lookup error:', error?.message || 'No profile found');
      return null;
    }
    
    // Type assertion since we're selecting specific columns
    const typedProfile = profile as {
      id: string;
      email: string;
      password_hash?: string;
      name?: string;
      position?: string;
      title?: string;
      company?: string;
      questionnaire_completed?: boolean;
      questionnaire_data?: Record<string, unknown>;
    };
    
    // Check if we have a password hash stored
    if (!typedProfile.password_hash) {
      console.log('User found in Supabase but no password hash stored - column may be missing');
      console.log('Run: ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;');
      return null;
    }
    
    console.log('✅ User loaded from Supabase:', typedProfile.name, typedProfile.email);
    
    return {
      id: typedProfile.id,
      email: typedProfile.email,
      passwordHash: typedProfile.password_hash,
      name: typedProfile.name || 'User',
      position: typedProfile.position || '',
      title: typedProfile.title || '',
      company: typedProfile.company || '',
      questionnaireCompleted: typedProfile.questionnaire_completed || false,
      questionnaireData: typedProfile.questionnaire_data,
    };
  } catch (err) {
    console.error('Supabase lookup error:', err);
    return null;
  }
}

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

    // Find user from in-memory store first
    let user = users.get(email.toLowerCase());
    
    // If not in memory, try Supabase
    if (!user) {
      console.log(`User ${email} not in memory, checking Supabase...`);
      const supabaseUser = await findUserFromSupabase(email);
      if (supabaseUser) {
        // Create a properly typed user object
        const storedUser = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          passwordHash: supabaseUser.passwordHash,
          name: supabaseUser.name,
          position: supabaseUser.position,
          title: supabaseUser.title,
          company: supabaseUser.company,
          questionnaireCompleted: supabaseUser.questionnaireCompleted,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        // Add to memory store for future lookups
        users.set(email.toLowerCase(), storedUser);
        user = users.get(email.toLowerCase());
        console.log(`User ${email} loaded from Supabase`);
      }
    }
    
    if (!user) {
      console.log(`User ${email} not found in memory or Supabase`);
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

