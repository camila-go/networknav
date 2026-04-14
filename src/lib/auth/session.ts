import { cookies } from "next/headers";
import type { AuthSession } from "@/types";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/jwt";

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  try {
    const cookieStore = await cookies();

    cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  } catch {
    console.debug("[Auth] Could not set cookies (likely called from Server Component)");
  }
}

export async function clearAuthCookies(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    cookieStore.delete(REFRESH_TOKEN_COOKIE);
  } catch {
    console.debug("[Auth] Could not clear cookies (likely called from Server Component)");
  }
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

async function refreshSession(refreshToken: string): Promise<AuthSession | null> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    await clearAuthCookies();
    return null;
  }

  const { getUserById, users } = await import("@/lib/stores");
  let user = getUserById(payload.userId);

  // Fallback to Supabase on cold start / different serverless instance
  if (!user) {
    try {
      const { supabaseAdmin, isSupabaseConfigured } = await import("@/lib/supabase/client");
      if (isSupabaseConfigured && supabaseAdmin) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', payload.userId)
          .single();

        if (profile) {
          const p = profile as {
            id: string; email: string; password_hash?: string; role?: string;
            name?: string; title?: string; company?: string;
            questionnaire_completed?: boolean;
          };
          const storedUser = {
            id: p.id,
            email: p.email,
            passwordHash: p.password_hash || '',
            role: (p.role as "user" | "moderator" | "admin") || 'user',
            name: p.name || 'User',
            title: p.title || '',
            company: p.company || '',
            questionnaireCompleted: p.questionnaire_completed || false,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          users.set(p.email.toLowerCase(), storedUser);
          user = storedUser;
        }
      }
    } catch {
      // Non-fatal: fall through to cookie clear
    }
  }

  if (!user) {
    await clearAuthCookies();
    return null;
  }

  const newAccessToken = await createAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role || "user",
  });
  const newRefreshToken = await createRefreshToken({ userId: user.id });

  await setAuthCookies(newAccessToken, newRefreshToken);

  return {
    userId: user.id,
    email: user.email,
    role: user.role || "user",
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };
}

export async function getSession(): Promise<AuthSession | null> {
  const { accessToken, refreshToken } = await getAuthCookies();

  if (!accessToken) {
    if (refreshToken) {
      return refreshSession(refreshToken);
    }
    return null;
  }

  const session = await verifyAccessToken(accessToken);
  if (!session) {
    if (refreshToken) {
      return refreshSession(refreshToken);
    }
    return null;
  }

  return session;
}
