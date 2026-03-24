import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { AuthSession } from "@/types";

// ============================================
// Environment & Secret Configuration
// ============================================

const IS_PRODUCTION = process.env.NODE_ENV === "production";

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
    console.warn(
      `⚠️  WARNING: Using development fallback for ${envVar}. ` +
        `Set ${envVar} in .env.local for production-like behavior.`
    );
    return new TextEncoder().encode(devFallback);
  }

  if (secret.length < 32) {
    throw new Error(
      `SECURITY ERROR: ${envVar} must be at least 32 characters long. ` +
        `Current length: ${secret.length}`
    );
  }

  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getSecret("JWT_SECRET", "development-secret-key-change-in-production-min32chars");
const JWT_REFRESH_SECRET = getSecret(
  "JWT_REFRESH_SECRET",
  "development-refresh-key-change-in-production-min32"
);

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export const ACCESS_TOKEN_COOKIE = "auth_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// ============================================
// Password Hashing
// ============================================

export async function hashPassword(password: string): Promise<string> {
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

export async function createRefreshToken(payload: { userId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<AuthSession | null> {
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

export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
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
