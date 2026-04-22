import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/client';

const TABLE = 'ai_conversation_starters';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined | null): value is string {
  return !!value && UUID_RE.test(value);
}

/**
 * Stable hash of the inputs that determine conversation starter content.
 * If any input changes (commonalities, role, etc.) the hash changes and
 * callers treat the cached row as a miss — ensuring stale starters are
 * regenerated instead of served.
 */
export function buildCacheVersion(inputs: {
  matchType: string;
  commonalities: string[];
  matchPosition?: string;
  matchCompany?: string;
}): string {
  const payload = [
    inputs.matchType,
    [...inputs.commonalities].sort().join('|'),
    inputs.matchPosition ?? '',
    inputs.matchCompany ?? '',
  ].join('\x1f');
  return createHash('sha1').update(payload).digest('hex').slice(0, 16);
}

/**
 * Look up cached AI starters for a viewer+match pair.
 * Returns null on miss, mismatch version, Supabase unavailable, or any error.
 */
export async function readStarterCache(
  viewerId: string,
  matchId: string,
  version: string,
): Promise<string[] | null> {
  if (!supabaseAdmin || !isUuid(viewerId) || !isUuid(matchId)) return null;

  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select('starters, cache_version')
      .eq('viewer_id', viewerId)
      .eq('match_id', matchId)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as { starters: string[]; cache_version: string };
    if (row.cache_version !== version) return null;
    if (!Array.isArray(row.starters) || row.starters.length === 0) return null;
    return row.starters;
  } catch {
    return null;
  }
}

/**
 * Persist freshly-generated AI starters. Fire-and-forget from the caller's
 * perspective; any DB error is logged but does not propagate.
 */
export async function writeStarterCache(
  viewerId: string,
  matchId: string,
  version: string,
  starters: string[],
): Promise<void> {
  if (!supabaseAdmin || !isUuid(viewerId) || !isUuid(matchId)) return;
  if (!Array.isArray(starters) || starters.length === 0) return;

  try {
    const { error } = await supabaseAdmin
      .from(TABLE)
      .upsert(
        {
          viewer_id: viewerId,
          match_id: matchId,
          cache_version: version,
          starters,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'viewer_id,match_id' },
      );
    if (error) {
      console.warn('[AI] starter cache write failed:', error.message);
    }
  } catch (err) {
    console.warn('[AI] starter cache write threw:', err);
  }
}
