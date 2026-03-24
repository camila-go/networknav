import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * When Supabase URL/keys are set, the app treats the database as source of truth.
 * API routes must not substitute fabricated users, matches, stats, or explore results.
 */
export function isLiveDatabaseMode(): boolean {
  return isSupabaseConfigured;
}
