import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { AuthSession } from "@/types";

// ============================================
// Environment & Secret Configuration
// ============================================

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Get JWT secret with strict production validation
 * In production, secrets MUST be configured - no fallbacks allowed
 */
function getSecret(envVar: string, devFallback: string): Uint8Array {
  const secret = process.env[envVar];
  
  if (!secret) {
    if (IS_PRODUCTION) {
      throw new Error(
        `SECURITY ERROR: ${envVar} is not configured. ` +
        `JWT secrets are required in production. ` +
        `Please set ${envVar} in your environment variables.`
      );
    }
    // Development only - warn about using fallback
    console.warn(
      `⚠️  WARNING: Using development fallback for ${envVar}. ` +
      `Set ${envVar} in .env.local for production-like behavior.`
    );
    return new TextEncoder().encode(devFallback);
  }
  
  // Validate secret strength
  if (secret.length < 32) {
    throw new Error(
      `SECURITY ERROR: ${envVar} must be at least 32 characters long. ` +
      `Current length: ${secret.length}`
    );
  }
  
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getSecret("JWT_SECRET", "development-secret-key-change-in-production-min32chars");
const JWT_REFRESH_SECRET = getSecret("JWT_REFRESH_SECRET", "development-refresh-key-change-in-production-min32");

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

// Cookie names
export const ACCESS_TOKEN_COOKIE = "auth_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// ============================================
// Password Hashing
// ============================================

export async function hashPassword(password: string): Promise<string> {
  // Salt rounds: 10 is a good balance of security and speed
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// ============================================
// JWT Token Management
// ============================================

export async function createAccessToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: {
  userId: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(
  token: string
): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      expiresAt: new Date((payload.exp as number) * 1000),
    };
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return {
      userId: payload.userId as string,
    };
  } catch {
    return null;
  }
}

// ============================================
// Cookie Management
// ============================================

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();

  // Access token cookie (httpOnly, secure, short-lived)
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60, // 15 minutes
  });

  // Refresh token cookie (httpOnly, secure, longer-lived)
  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getAuthCookies(): Promise<{
  accessToken: string | undefined;
  refreshToken: string | undefined;
}> {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
  };
}

// ============================================
// Session Management
// ============================================

export async function getSession(): Promise<AuthSession | null> {
  const { accessToken, refreshToken } = await getAuthCookies();

  if (!accessToken) {
    // Try to refresh if we have a refresh token
    if (refreshToken) {
      return refreshSession(refreshToken);
    }
    return null;
  }

  const session = await verifyAccessToken(accessToken);
  if (!session) {
    // Token expired, try to refresh
    if (refreshToken) {
      return refreshSession(refreshToken);
    }
    return null;
  }

  return session;
}

async function refreshSession(
  refreshToken: string
): Promise<AuthSession | null> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    await clearAuthCookies();
    return null;
  }

  // In a real app, you'd fetch the user from DB here to get their email
  // For now, we'll need to handle this in the API route
  return null;
}

// ============================================
// Validation Helpers
// ============================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

