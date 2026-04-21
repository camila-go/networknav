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
import type { UserRole } from "@/types";
import { applyAdminEmailEnvPromotion } from "@/lib/auth/admin-env";

// Rate limit for login (prod: strict; dev: room to debug without locking yourself out).
// Read inside POST so tests can override NODE_ENV via vi.stubEnv().
function getLoginRateLimit() {
  return process.env.NODE_ENV === "production"
    ? { maxRequests: 5, windowMs: 15 * 60 * 1000 }
    : { maxRequests: 100, windowMs: 15 * 60 * 1000 };
}

const MSG_SSO_ONLY =
  "This account uses corporate SSO. Use “Sign in with Corporate SSO” instead of email and password.";
const MSG_NO_PASSWORD_ON_FILE =
  "We found your profile, but there is no password on file. Use “Sign in with Corporate SSO”, or ask your administrator to set a password for email login.";

/** True when this hash is not a bcrypt hash and password login is intentionally disabled (SSO users). */
function isSsoOnlyPasswordHash(hash: string): boolean {
  return hash === "SAML_SSO_NO_PASSWORD" || hash.startsWith("SAML_SSO:");
}

/**
 * When email/password login has no user row in memory/Supabase loader, check if a profile
 * exists anyway so we can return a clearer message than “invalid credentials”.
 */
async function loginHintIfProfileExistsWithoutPasswordLogin(
  email: string
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;
  try {
    const row = await selectUserProfileRowByEmailForLogin(email);
    if (!row) return null;
    const ph = row.password_hash as string | null | undefined;
    if (ph == null || String(ph).trim() === "") {
      return MSG_NO_PASSWORD_ON_FILE;
    }
    if (isSsoOnlyPasswordHash(String(ph))) {
      return MSG_SSO_ONLY;
    }
    return null;
  } catch {
    return null;
  }
}

/** Escape `%`, `_`, `\` so `ilike` is an exact string match (case-insensitive). */
function escapeForILikeExact(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Resolve `user_profiles` by email even when DB casing differs from what the user typed
 * (e.g. row `Camila.Gonzalez@…` vs login `camila.gonzalez@…`).
 */
async function selectUserProfileRowByEmailForLogin(
  emailRaw: string
): Promise<Record<string, unknown> | null> {
  if (!supabaseAdmin) return null;
  const trimmed = emailRaw.trim();
  const lower = trimmed.toLowerCase();
  const variants = [...new Set([lower, trimmed])];

  for (const v of variants) {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("email", v)
      .maybeSingle();
    if (!error && data) return data as Record<string, unknown>;
  }

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .ilike("email", escapeForILikeExact(trimmed))
    .maybeSingle();
  if (!error && data) return data as Record<string, unknown>;
  return null;
}

// Helper to find user from Supabase and add to memory store
async function findUserFromSupabase(email: string): Promise<{
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  title: string;
  company: string;
  questionnaireCompleted: boolean;
  questionnaireData?: Record<string, unknown>;
} | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;

  try {
    const profile = await selectUserProfileRowByEmailForLogin(email);

    if (!profile) {
      console.log("Supabase profile lookup: no row for email (after case-insensitive match)");
      return null;
    }

    // Type assertion since we're selecting all columns
    const typedProfile = profile as {
      id: string;
      email: string;
      password_hash?: string;
      role?: string;
      name?: string;
      title?: string;
      company?: string;
      questionnaire_completed?: boolean;
      questionnaire_data?: Record<string, unknown>;
    };

    // Check if we have a bcrypt password stored (SSO sentinel or empty = not valid for email login)
    if (!typedProfile.password_hash) {
      console.log(
        "Supabase: profile exists for",
        typedProfile.email,
        "but password_hash is empty — email/password login unavailable."
      );
      return null;
    }
    console.log("✅ User loaded from Supabase:", typedProfile.name, typedProfile.email);

    return {
      id: typedProfile.id,
      email: typedProfile.email,
      passwordHash: typedProfile.password_hash,
      role: (typedProfile.role as UserRole) || 'user',
      name: typedProfile.name || 'User',
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
    const loginLimit = getLoginRateLimit();
    const rateLimitResult = await checkRateLimit(
      `login:${ip}`,
      "login",
      loginLimit.maxRequests,
      loginLimit.windowMs
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
          email: supabaseUser.email.toLowerCase(),
          passwordHash: supabaseUser.passwordHash,
          role: supabaseUser.role,
          name: supabaseUser.name,
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
    } else if (isSupabaseConfigured && supabaseAdmin) {
      // User was in memory — sync role from Supabase in case it was changed externally
      try {
        const { data } = await supabaseAdmin
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        const dbRole = (data?.role as UserRole) || 'user';
        if (dbRole !== user.role) {
          user = { ...user, role: dbRole };
          users.set(email.toLowerCase(), user);
          console.log(`Synced role for ${email} from Supabase: ${dbRole}`);
        }
      } catch {
        // Non-fatal: proceed with in-memory role
      }
    }

    if (!user) {
      console.log(`User ${email} not found in memory or Supabase`);
      const hint = await loginHintIfProfileExistsWithoutPasswordLogin(email);
      return NextResponse.json(
        {
          success: false,
          error: hint || "Invalid email or password",
        },
        { status: 401 }
      );
    }

    if (isSsoOnlyPasswordHash(user.passwordHash)) {
      return NextResponse.json(
        {
          success: false,
          error: MSG_SSO_ONLY,
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

    // Bootstrap admin role from ADMIN_EMAILS env var
    applyAdminEmailEnvPromotion(user);
    users.set(user.email.toLowerCase(), user);

    const userRole: UserRole = user.role || 'user';

    // Create tokens
    const accessToken = await createAccessToken({
      userId: user.id,
      email: user.email,
      role: userRole,
    });
    const refreshToken = await createRefreshToken({ userId: user.id });

    // Create response with user data
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: userRole,
          profile: {
            name: user.name,
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
