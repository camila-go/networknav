/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const maybeSingle = vi.fn();
const eqMatch = vi.fn(() => ({ maybeSingle }));
const eqViewer = vi.fn(() => ({ eq: eqMatch }));
const select = vi.fn(() => ({ eq: eqViewer }));
const upsert = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn(() => ({ select, upsert }));

vi.mock('@/lib/supabase/client', () => ({
  supabaseAdmin: { from: fromMock },
}));

async function loadCache() {
  vi.resetModules();
  return import('./starter-cache');
}

const VIEWER = '11111111-2222-3333-4444-555555555555';
const MATCHED = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('buildCacheVersion', () => {
  it('produces a stable hash for the same inputs', async () => {
    const { buildCacheVersion } = await loadCache();
    const a = buildCacheVersion({
      matchType: 'high-affinity',
      commonalities: ['b', 'a'],
      matchPosition: 'VP',
      matchCompany: 'Acme',
    });
    const b = buildCacheVersion({
      matchType: 'high-affinity',
      commonalities: ['a', 'b'],
      matchPosition: 'VP',
      matchCompany: 'Acme',
    });
    expect(a).toBe(b); // commonality order shouldn't affect the hash
    expect(a).toHaveLength(16);
  });

  it('changes when match type changes', async () => {
    const { buildCacheVersion } = await loadCache();
    const affinity = buildCacheVersion({
      matchType: 'high-affinity',
      commonalities: ['x'],
    });
    const strategic = buildCacheVersion({
      matchType: 'strategic',
      commonalities: ['x'],
    });
    expect(affinity).not.toBe(strategic);
  });
});

describe('readStarterCache', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    eqMatch.mockClear();
    eqViewer.mockClear();
    select.mockClear();
    fromMock.mockClear();
  });

  it('returns null when viewerId is not a UUID', async () => {
    const { readStarterCache } = await loadCache();
    const result = await readStarterCache('not-a-uuid', MATCHED, 'v1');
    expect(result).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('returns null on cache miss', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { readStarterCache } = await loadCache();
    const result = await readStarterCache(VIEWER, MATCHED, 'v1');
    expect(result).toBeNull();
  });

  it('returns null when cache_version does not match', async () => {
    maybeSingle.mockResolvedValue({
      data: { starters: ['hi'], cache_version: 'old' },
      error: null,
    });
    const { readStarterCache } = await loadCache();
    const result = await readStarterCache(VIEWER, MATCHED, 'new');
    expect(result).toBeNull();
  });

  it('returns starters on version match', async () => {
    maybeSingle.mockResolvedValue({
      data: { starters: ['one', 'two', 'three'], cache_version: 'v1' },
      error: null,
    });
    const { readStarterCache } = await loadCache();
    const result = await readStarterCache(VIEWER, MATCHED, 'v1');
    expect(result).toEqual(['one', 'two', 'three']);
  });

  it('returns null if the stored starters array is empty', async () => {
    maybeSingle.mockResolvedValue({
      data: { starters: [], cache_version: 'v1' },
      error: null,
    });
    const { readStarterCache } = await loadCache();
    const result = await readStarterCache(VIEWER, MATCHED, 'v1');
    expect(result).toBeNull();
  });

  it('returns null on Supabase error', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { readStarterCache } = await loadCache();
    const result = await readStarterCache(VIEWER, MATCHED, 'v1');
    expect(result).toBeNull();
  });
});

describe('writeStarterCache', () => {
  beforeEach(() => {
    upsert.mockReset();
    upsert.mockResolvedValue({ error: null });
    fromMock.mockClear();
  });

  it('is a no-op when starters is empty', async () => {
    const { writeStarterCache } = await loadCache();
    await writeStarterCache(VIEWER, MATCHED, 'v1', []);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('is a no-op for non-UUID ids', async () => {
    const { writeStarterCache } = await loadCache();
    await writeStarterCache('demo-user', MATCHED, 'v1', ['a']);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('upserts rows with the expected shape', async () => {
    const { writeStarterCache } = await loadCache();
    await writeStarterCache(VIEWER, MATCHED, 'v1', ['hi', 'there']);
    expect(fromMock).toHaveBeenCalledWith('ai_conversation_starters');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        viewer_id: VIEWER,
        match_id: MATCHED,
        cache_version: 'v1',
        starters: ['hi', 'there'],
      }),
      { onConflict: 'viewer_id,match_id' },
    );
  });

  it('swallows DB errors without throwing', async () => {
    upsert.mockResolvedValueOnce({ error: { message: 'db down' } });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { writeStarterCache } = await loadCache();
    await expect(
      writeStarterCache(VIEWER, MATCHED, 'v1', ['a']),
    ).resolves.toBeUndefined();
    warn.mockRestore();
  });
});

describe('starter-cache without Supabase', () => {
  it('readStarterCache returns null when supabaseAdmin is null', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/client', () => ({ supabaseAdmin: null }));
    const { readStarterCache } = await import('./starter-cache');
    const result = await readStarterCache(VIEWER, MATCHED, 'v1');
    expect(result).toBeNull();
    vi.doUnmock('@/lib/supabase/client');
  });

  it('writeStarterCache is a no-op when supabaseAdmin is null', async () => {
    vi.resetModules();
    vi.doMock('@/lib/supabase/client', () => ({ supabaseAdmin: null }));
    const { writeStarterCache } = await import('./starter-cache');
    await expect(
      writeStarterCache(VIEWER, MATCHED, 'v1', ['a']),
    ).resolves.toBeUndefined();
    vi.doUnmock('@/lib/supabase/client');
  });
});
