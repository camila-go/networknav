import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { UserRole } from "@/types";
import type { StoredUser } from "@/lib/stores/users-store";

/** Emails listed in ADMIN_EMAILS (comma-separated, case-insensitive). */
export function parseAdminEmailsFromEnv(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * True when this email should be upgraded to admin from env.
 * Does not downgrade moderators or existing admins.
 */
export function shouldPromoteEmailToAdminViaEnv(
  email: string,
  currentRole: UserRole | undefined
): boolean {
  if (!parseAdminEmailsFromEnv().has(email.trim().toLowerCase())) return false;
  return !currentRole || currentRole === "user";
}

/**
 * If `user.email` is in ADMIN_EMAILS and role is still default, set `role` to admin
 * and persist to Supabase (same behavior as password login).
 */
export function applyAdminEmailEnvPromotion(user: StoredUser): void {
  if (!shouldPromoteEmailToAdminViaEnv(user.email, user.role)) return;
  user.role = "admin";
  if (isSupabaseConfigured && supabaseAdmin) {
    void supabaseAdmin
      .from("user_profiles")
      .update({ role: "admin" } as never)
      .eq("id", user.id)
      .then(() =>
        console.log(`Auto-promoted ${user.email} to admin (ADMIN_EMAILS)`)
      );
  }
}
