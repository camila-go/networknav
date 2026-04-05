import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export async function fetchProfileBasics(
  userId: string
): Promise<{ name: string; position: string; company?: string; email?: string | null; photoUrl?: string } | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;
  try {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("name, position, title, company, email, photo_url")
      .eq("id", userId)
      .maybeSingle();
    if (!data || !(data as { name?: string }).name) return null;
    const row = data as {
      name: string;
      position?: string;
      title?: string;
      company?: string;
      email?: string | null;
      photo_url?: string;
    };
    return {
      name: row.name,
      position: row.position || row.title || "Member",
      company: row.company,
      email: row.email ?? null,
      photoUrl: row.photo_url,
    };
  } catch {
    return null;
  }
}
