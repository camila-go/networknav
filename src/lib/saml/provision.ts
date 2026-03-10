/**
 * JIT (Just-In-Time) user provisioning for SAML SSO
 *
 * Creates a new user on first SSO login using IdP-provided attributes,
 * following the same dual-storage pattern (in-memory + Supabase) used
 * by the registration route.
 */

import { users, type StoredUser } from "@/lib/stores/users-store";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
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
          email: data.email,
          passwordHash: data.password_hash || "SAML_SSO_NO_PASSWORD",
          name: data.name,
          position: data.position || data.title || "",
          title: data.title || data.position || "",
          company: data.company || undefined,
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
    const updated = {
      ...existing,
      name: attrs.name || existing.name,
      title: attrs.title || existing.title,
      position: attrs.title || existing.position, // same IdP field
      company: attrs.company ?? existing.company,
      updatedAt: new Date(),
    };
    users.set(email, updated);

    // Sync to Supabase (non-blocking)
    if (isSupabaseConfigured && supabaseAdmin) {
      supabaseAdmin
        .from("user_profiles")
        .update({
          name: updated.name,
          title: updated.title,
          position: updated.position,
          company: updated.company,
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

  const newUser: StoredUser = {
    id: userId,
    email,
    passwordHash,
    name: attrs.name,
    title: attrs.title,
    position: attrs.title, // same IdP field mapped to both
    company: attrs.company,
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
          name: newUser.name,
          position: newUser.position,
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
