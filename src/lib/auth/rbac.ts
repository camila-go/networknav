import { NextResponse } from "next/server";
import type { AuthSession, UserRole } from "@/types";
import { getSession } from "@/lib/auth/session";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
};

export function hasRole(session: AuthSession, ...roles: UserRole[]): boolean {
  return roles.includes(session.role);
}

export function hasMinRole(session: AuthSession, minRole: UserRole): boolean {
  return ROLE_HIERARCHY[session.role] >= ROLE_HIERARCHY[minRole];
}

export function isAdmin(session: AuthSession): boolean {
  return session.role === "admin";
}

export function isModerator(session: AuthSession): boolean {
  return session.role === "moderator" || session.role === "admin";
}

/**
 * Require at least moderator role for API routes.
 * Returns the session or a 403 NextResponse.
 */
export async function requireModerator(): Promise<
  AuthSession | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  if (!isModerator(session)) {
    return NextResponse.json(
      { success: false, error: "Insufficient permissions" },
      { status: 403 }
    );
  }
  return session;
}

/**
 * Require admin role for API routes.
 * Returns the session or a 403 NextResponse.
 */
export async function requireAdmin(): Promise<
  AuthSession | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }
  if (!isAdmin(session)) {
    return NextResponse.json(
      { success: false, error: "Admin access required" },
      { status: 403 }
    );
  }
  return session;
}
