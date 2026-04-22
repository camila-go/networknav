/**
 * JIT (Just-In-Time) user provisioning for SAML SSO
 *
 * Creates a new user on first SSO login using IdP-provided attributes,
 * following the same dual-storage pattern (in-memory + Supabase) used
 * by the registration route.
 */

import type { UserRole } from "@/types";
import { users, type StoredUser } from "@/lib/stores/users-store";
import {
  applyAdminEmailEnvPromotion,
  shouldPromoteEmailToAdminViaEnv,
} from "@/lib/auth/admin-env";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { normalizeCompany } from "@/lib/company/normalize";
import type { SamlUserAttributes } from "./types";

/**
 * Provision or update a user from SAML assertion attributes.
 *
 * - New users: created in both in-memory Map and Supabase with an
 *   unknowable password hash (prevents password login for SSO users).
 * - Existing users: profile fields are synced from IdP attributes.
 *
 * @returns The user record and whether this was a new account.
 */
export async function provisionSamlUser(
  attrs: SamlUserAttributes
): Promise<{ user: StoredUser; isNewUser: boolean }> {
  const email = attrs.email.toLowerCase();
  const normalizedCompany = normalizeCompany(attrs.company);

  // 1. Check in-memory store
  let existing = users.get(email);

  // 2. If not in memory, check Supabase
  if (!existing && isSupabaseConfigured && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from("user_profiles")
        .select("*")
        .eq("email", email)
        .single();

      if (data) {
        // Load into memory for fast future access
        existing = {
          id: data.id,
          email: data.email ?? email,
          passwordHash: "SAML_SSO_NO_PASSWORD",
          role: (data.role || "user") as UserRole,
          name: data.name,
          title: data.title || "",
          company: normalizeCompany(data.company) || undefined,
          photoUrl: data.photo_url || undefined,
          location: data.location || undefined,
          questionnaireCompleted: data.questionnaire_completed ?? false,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
        users.set(email, existing);
      }
    } catch (err) {
      console.error("SAML provision: Supabase lookup failed:", err);
    }
  }

  // 3. Existing user — sync attributes from IdP
  if (existing) {
    const updated: StoredUser = {
      ...existing,
      name: attrs.name || existing.name,
      title: attrs.title || existing.title,
      company: normalizedCompany ?? existing.company,
      updatedAt: new Date(),
    };
    applyAdminEmailEnvPromotion(updated);
    users.set(email, updated);

    // Sync to Supabase (non-blocking)
    if (isSupabaseConfigured && supabaseAdmin) {
      supabaseAdmin
        .from("user_profiles")
        .update({
          name: updated.name,
          title: updated.title,
          company: updated.company,
          role: updated.role,
          updated_at: updated.updatedAt.toISOString(),
        } as never)
        .eq("email", email)
        .then(({ error }) => {
          if (error)
            console.error("SAML provision: Supabase sync error:", error);
        });
    }

    return { user: updated, isNewUser: false };
  }

  // 4. New user — JIT provision
  const userId = crypto.randomUUID();
  const now = new Date();

  // Generate an unknowable password hash so SSO users cannot
  // authenticate via the email/password login form.
  const randomPassword = crypto.randomUUID() + crypto.randomUUID();
  // Store a sentinel prefix so we can identify SSO-provisioned users
  const passwordHash = `SAML_SSO:${randomPassword}`;

  const initialRole: UserRole = shouldPromoteEmailToAdminViaEnv(email, undefined)
    ? "admin"
    : "user";

  const newUser: StoredUser = {
    id: userId,
    email,
    passwordHash,
    role: initialRole,
    name: attrs.name,
    title: attrs.title,
    company: normalizedCompany,
    questionnaireCompleted: false,
    createdAt: now,
    updatedAt: now,
  };

  // Save to in-memory store
  users.set(email, newUser);

  // Save to Supabase
  if (isSupabaseConfigured && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          id: userId,
          user_id: userId,
          email,
          password_hash: passwordHash,
          role: newUser.role,
          name: newUser.name,
          title: newUser.title,
          company: newUser.company,
          questionnaire_completed: false,
          is_active: true,
          is_visible: true,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        } as never);

      if (error) {
        // Duplicate key means user was created between our check and insert
        if (error.message?.includes("duplicate")) {
          console.warn("SAML provision: user already exists in Supabase");
        } else {
          console.error("SAML provision: Supabase insert error:", error);
        }
      }
    } catch (err) {
      console.error("SAML provision: Supabase insert failed:", err);
      // Don't fail provisioning — user is in memory
    }
  }

  return { user: newUser, isNewUser: true };
}
