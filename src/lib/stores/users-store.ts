/**
 * In-memory user store (replace with database in production)
 *
 * Uses globalThis so the Map is shared across Next.js route compilations
 * (each API route is bundled separately in App Router).
 */

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  position: string;
  title: string;
  company?: string;
  photoUrl?: string;
  location?: string;
  questionnaireCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const g = globalThis as unknown as { __netnav_users?: Map<string, StoredUser> };
export const users = (g.__netnav_users ??= new Map<string, StoredUser>());
