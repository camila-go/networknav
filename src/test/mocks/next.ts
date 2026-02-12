/**
 * Mock utilities for Next.js server features used in API route tests
 */

import { NextRequest } from "next/server";

interface MockRequestOptions {
  method?: string;
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  searchParams?: Record<string, string>;
}

/**
 * Create a mock NextRequest with configurable options
 */
export function createMockNextRequest(options: MockRequestOptions = {}): NextRequest {
  const {
    method = "GET",
    url = "http://localhost:3000/api/test",
    body,
    headers = {},
    cookies = {},
    searchParams = {},
  } = options;

  // Build URL with search params
  const urlObj = new URL(url);
  for (const [key, value] of Object.entries(searchParams)) {
    urlObj.searchParams.set(key, value);
  }

  // Build headers
  const reqHeaders = new Headers(headers);
  if (body && !reqHeaders.has("content-type")) {
    reqHeaders.set("content-type", "application/json");
  }

  // Build cookie header
  if (Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    reqHeaders.set("cookie", cookieString);
  }

  const init: RequestInit = {
    method,
    headers: reqHeaders,
  };

  if (body && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj, init);
}

/**
 * Parse a Response object to extract JSON body and status
 */
export async function parseJsonResponse(response: Response): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const body = await response.json();
  return {
    status: response.status,
    body,
  };
}

/**
 * Create a mock cookies() function for next/headers
 * Returns a cookie store object with get/set/delete methods
 */
export function createMockCookieStore(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    get: (name: string) => {
      const value = store.get(name);
      return value ? { name, value } : undefined;
    },
    set: vi.fn((name: string, value: string) => {
      store.set(name, value);
    }),
    delete: vi.fn((name: string) => {
      store.delete(name);
    }),
    getAll: () => Array.from(store.entries()).map(([name, value]) => ({ name, value })),
    has: (name: string) => store.has(name),
    _store: store,
  };
}
