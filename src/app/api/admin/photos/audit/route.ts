import { NextResponse } from "next/server";
import { requireModerator } from "@/lib/auth/rbac";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

type BrokenAvatar = {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  photo_url: string;
  status: number | "error";
};

type AuditSummary = {
  scanned: number;
  withPhoto: number;
  broken: BrokenAvatar[];
  truncated: boolean;
};

const HEAD_CONCURRENCY = 8;
const HEAD_TIMEOUT_MS = 5_000;
/** Cap to avoid runaway HEAD floods on very large tenants. */
const MAX_ROWS = 2_000;

async function headStatus(url: string): Promise<number | "error"> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ctrl.signal });
    return res.status;
  } catch {
    return "error";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Walk pools in fixed-size chunks so we don't hold thousands of HEADs in flight.
 */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function lane() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx]!);
    }
  }
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, lane);
  await Promise.all(lanes);
  return results;
}

/**
 * GET /api/admin/photos/audit
 *
 * Returns the list of `user_profiles` rows whose `photo_url` currently 404s (or fails to
 * fetch). Used to identify users whose avatar silently broke before the upload flow was
 * hardened (versioned keys, no pre-delete, fail-loud DB sync). Moderator-only.
 */
export async function GET() {
  const session = await requireModerator();
  if (session instanceof NextResponse) return session;

  if (!isSupabaseConfigured || !supabaseAdmin) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 503 }
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id, user_id, name, email, photo_url")
      .not("photo_url", "is", null)
      .neq("photo_url", "")
      .limit(MAX_ROWS + 1);

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      id: string;
      user_id: string | null;
      name: string | null;
      email: string | null;
      photo_url: string | null;
    }>;

    const truncated = rows.length > MAX_ROWS;
    const sample = truncated ? rows.slice(0, MAX_ROWS) : rows;

    const statuses = await runWithConcurrency(
      sample,
      HEAD_CONCURRENCY,
      async (row) => ({
        row,
        status: await headStatus((row.photo_url ?? "").trim()),
      })
    );

    const broken: BrokenAvatar[] = [];
    for (const { row, status } of statuses) {
      const ok = typeof status === "number" && status >= 200 && status < 400;
      if (!ok) {
        broken.push({
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          email: row.email,
          photo_url: (row.photo_url ?? "").trim(),
          status,
        });
      }
    }

    const summary: AuditSummary = {
      scanned: sample.length,
      withPhoto: sample.length,
      broken,
      truncated,
    };

    return NextResponse.json({ success: true, data: summary });
  } catch (error) {
    console.error("Photo audit error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to audit photos" },
      { status: 500 }
    );
  }
}
