/**
 * In-memory connections store (replace with database in production)
 *
 * Uses globalThis so the Maps are shared across Next.js route compilations.
 */

import type { Connection, Message, Match } from "@/types";

const g = globalThis as unknown as {
  __netnav_connections?: Map<string, Connection>;
  __netnav_messages?: Map<string, Message[]>;
  __netnav_userMatches?: Map<string, Match[]>;
};

export const connections = (g.__netnav_connections ??= new Map<string, Connection>());
export const messages = (g.__netnav_messages ??= new Map<string, Message[]>());
export const userMatches = (g.__netnav_userMatches ??= new Map<string, Match[]>());
