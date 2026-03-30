/**
 * In-memory user store (replace with database in production)
 *
 * Uses globalThis so the Map is shared across Next.js route compilations
 * (each API route is bundled separately in App Router).
 */

import type { UserRole } from "@/types";

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  position: string;
  title: string;
  company?: string;
  photoUrl?: string;
  bio?: string;
  location?: string;
  questionnaireCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const g = globalThis as unknown as { __netnav_users?: Map<string, StoredUser> };
export const users = (g.__netnav_users ??= new Map<string, StoredUser>());

/** Map is keyed by email; use this when you only have user id (e.g. JWT / explore_posts.user_id). */
export function getUserById(id: string): StoredUser | undefined {
  for (const u of users.values()) {
    if (u.id === id) return u;
  }
  return undefined;
}
