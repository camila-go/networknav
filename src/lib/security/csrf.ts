/**
 * CSRF (Cross-Site Request Forgery) Protection
 * 
 * Implements double-submit cookie pattern for CSRF protection.
 * This approach works well with Next.js API routes and doesn't require
 * server-side session storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// CSRF token cookie name
export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

// Token validity period (1 hour)
const TOKEN_VALIDITY_MS = 60 * 60 * 1000;

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomUUID().replace(/-/g, "");
  return `${timestamp}.${randomPart}`;
}

/**
 * Parse and validate CSRF token format
 */
function parseToken(token: string): { timestamp: number; isValid: boolean } {
  try {
    const [timestampStr] = token.split(".");
    const timestamp = parseInt(timestampStr, 36);
    
    if (isNaN(timestamp)) {
      return { timestamp: 0, isValid: false };
    }
    
    // Check if token is not expired
    const now = Date.now();
    const isValid = now - timestamp < TOKEN_VALIDITY_MS;
    
    return { timestamp, isValid };
  } catch {
    return { timestamp: 0, isValid: false };
  }
}

/**
 * Set CSRF token cookie on response
 */
export function setCsrfCookie(response: NextResponse, token?: string): string {
  const csrfToken = token || generateCsrfToken();
  
  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_VALIDITY_MS / 1000,
  });
  
  return csrfToken;
}

/**
 * Get or create CSRF token from cookies
 */
export async function getOrCreateCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (existingToken) {
    const { isValid } = parseToken(existingToken);
    if (isValid) {
      return existingToken;
    }
  }
  
  return generateCsrfToken();
}

/**
 * Validate CSRF token from request
 * Compares cookie token with header token (double-submit pattern)
 */
export async function validateCsrfToken(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Skip CSRF validation for safe methods
  const safeMethodsPattern = /^(GET|HEAD|OPTIONS)$/i;
  if (safeMethodsPattern.test(request.method)) {
    return { valid: true };
  }
  
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  
  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  
  // Both must be present
  if (!cookieToken) {
    return { valid: false, error: "CSRF cookie missing" };
  }
  
  if (!headerToken) {
    return { valid: false, error: "CSRF header missing" };
  }
  
  // Tokens must match
  if (cookieToken !== headerToken) {
    return { valid: false, error: "CSRF token mismatch" };
  }
  
  // Token must be valid (not expired)
  const { isValid } = parseToken(cookieToken);
  if (!isValid) {
    return { valid: false, error: "CSRF token expired" };
  }
  
  return { valid: true };
}

/**
 * CSRF protection wrapper for API handlers
 * Use this to protect state-changing endpoints
 */
export async function withCsrfProtection<T>(
  request: NextRequest,
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  const { valid, error } = await validateCsrfToken(request);
  
  if (!valid) {
    return NextResponse.json(
      {
        success: false,
        error: "CSRF validation failed",
        details: error,
      },
      { status: 403 }
    );
  }
  
  return handler();
}

/**
 * API endpoint to get a fresh CSRF token
 * Call this endpoint to get a token for subsequent requests
 */
export async function getCsrfTokenHandler(): Promise<NextResponse> {
  const token = await getOrCreateCsrfToken();
  
  const response = NextResponse.json({
    success: true,
    data: { csrfToken: token },
  });
  
  setCsrfCookie(response, token);
  
  return response;
}

/**
 * Client-side helper to get CSRF token from cookie
 * Use this in your fetch calls
 */
export const CSRF_CLIENT_HELPER = `
// Add this to your API calls:
function getCsrfToken() {
  const match = document.cookie.match(new RegExp('(^| )${CSRF_COOKIE_NAME}=([^;]+)'));
  return match ? match[2] : null;
}

// Usage in fetch:
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    '${CSRF_HEADER_NAME}': getCsrfToken(),
  },
  body: JSON.stringify(data),
});
`;

