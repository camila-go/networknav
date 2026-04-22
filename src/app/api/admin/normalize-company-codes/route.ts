import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/rbac";
import { users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { COMPANY_CODES, normalizeCompany } from "@/lib/company/normalize";

/**
 * POST /api/admin/normalize-company-codes
 *
 * One-shot backfill: for every user whose `company` is a known
 * business-unit code (SS001/SS01/CU001/CU01/SU001/SU01), rewrite
 * it to the proper display name in both Supabase and the in-memory
 * store. Idempotent — rerunning after a clean run returns zeros.
 */
export async function POST() {
  const session = await requireAdmin();
  if (session instanceof NextResponse) return session;

  const byCode: Record<string, { supabase: number; memory: number }> = {};
  let supabaseTotal = 0;
  let memoryTotal = 0;

  for (const code of COMPANY_CODES) {
    byCode[code] = { supabase: 0, memory: 0 };
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    for (const code of COMPANY_CODES) {
      const normalized = normalizeCompany(code);
      if (!normalized || normalized === code) continue;

      const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .update({ company: normalized } as never)
        .eq("company", code)
        .select("id");

      if (error) {
        console.error(
          `[normalize-company-codes] Supabase update failed for ${code}:`,
          error
        );
        continue;
      }

      const rowCount = data?.length ?? 0;
      byCode[code].supabase = rowCount;
      supabaseTotal += rowCount;
    }
  }

  for (const [email, user] of users.entries()) {
    const current = user.company;
    if (!current) continue;
    const key = current.trim().toUpperCase();
    if (!COMPANY_CODES.includes(key)) continue;
    const normalized = normalizeCompany(current);
    if (!normalized || normalized === current) continue;
    users.set(email, { ...user, company: normalized, updatedAt: new Date() });
    byCode[key].memory += 1;
    memoryTotal += 1;
  }

  return NextResponse.json({
    success: true,
    data: {
      updated: { supabase: supabaseTotal, memory: memoryTotal },
      byCode,
    },
  });
}
