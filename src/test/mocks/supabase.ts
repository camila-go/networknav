/**
 * Mock Supabase client for testing
 * Supports the chainable builder pattern used throughout the codebase
 */

interface MockQueryResult {
  data: unknown;
  error: unknown;
}

/**
 * Create a chainable mock Supabase client
 *
 * Usage:
 *   const { client, setResult } = createMockSupabaseClient();
 *   setResult({ data: [{ id: '1', name: 'Test' }], error: null });
 *   vi.mock('@/lib/supabase/client', () => ({ supabaseAdmin: client }));
 */
export function createMockSupabaseClient() {
  let result: MockQueryResult = { data: null, error: null };

  const chainable = () => {
    const chain: Record<string, unknown> = {};
    const methods = [
      "select", "insert", "update", "delete", "upsert",
      "eq", "neq", "gt", "gte", "lt", "lte",
      "in", "or", "not", "like", "ilike",
      "is", "contains", "containedBy",
      "order", "limit", "range", "offset",
      "single", "maybeSingle",
      "count", "head",
      "csv", "geojson",
      "textSearch", "match", "filter",
    ];

    for (const method of methods) {
      chain[method] = vi.fn().mockImplementation(() => {
        // Terminal methods return the result
        if (["single", "maybeSingle"].includes(method)) {
          return Promise.resolve(result);
        }
        return chain;
      });
    }

    // Make the chain itself thenable (for await without .single())
    chain.then = (resolve: (value: MockQueryResult) => void) => {
      return Promise.resolve(result).then(resolve);
    };

    return chain;
  };

  const client = {
    from: vi.fn().mockImplementation(() => chainable()),
    rpc: vi.fn().mockImplementation(() => Promise.resolve(result)),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };

  return {
    client,
    setResult: (newResult: MockQueryResult) => {
      result = newResult;
    },
  };
}
