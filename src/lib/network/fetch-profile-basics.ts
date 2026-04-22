import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { normalizeCompany } from "@/lib/company/normalize";

export async function fetchProfileBasics(
  userId: string
): Promise<{ name: string; title: string; company?: string; email?: string | null; photoUrl?: string } | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;
  try {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("name, title, company, email, photo_url")
      .eq("id", userId)
      .maybeSingle();
    if (!data || !(data as { name?: string }).name) return null;
    const row = data as {
      name: string;
      title?: string;
      company?: string;
      email?: string | null;
      photo_url?: string;
    };
    return {
      name: row.name,
      title: row.title || "Member",
      company: normalizeCompany(row.company),
      email: row.email ?? null,
      photoUrl: row.photo_url,
    };
  } catch {
    return null;
  }
}
