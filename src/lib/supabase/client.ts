import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ============================================
// Configuration Constants
// ============================================

// Query timeout in milliseconds (10 seconds)
const QUERY_TIMEOUT_MS = 10000;

// Connection pool size for server-side client
const DB_POOL_SIZE = 10;

// Environment variable validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

/**
 * Custom fetch with timeout for Supabase requests
 * Prevents hanging requests from blocking the event loop
 */
function fetchWithTimeout(timeout: number): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Supabase request timed out after ${timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Client-side Supabase client (safe for browser)
 * Uses anon key with Row Level Security
 */
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      global: {
        fetch: fetchWithTimeout(QUERY_TIMEOUT_MS),
      },
      db: {
        schema: 'public',
      },
    })
  : null;

/**
 * Server-side Supabase client with elevated permissions
 * ONLY use in API routes - never expose to client
 * 
 * Features:
 * - Service role key for bypassing RLS
 * - Query timeout protection
 * - Disabled session persistence (stateless)
 */
export const supabaseAdmin: SupabaseClient<Database> | null = 
  supabaseUrl && supabaseServiceRoleKey
    ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: fetchWithTimeout(QUERY_TIMEOUT_MS),
          headers: {
            'x-connection-pool-size': String(DB_POOL_SIZE),
          },
        },
        db: {
          schema: 'public',
        },
      })
    : null;

/**
 * Helper to get current authenticated user from Supabase
 */
export async function getCurrentSupabaseUser() {
  if (!supabase) {
    return { user: null, error: new Error('Supabase not configured') };
  }
  
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

/**
 * Helper to get user session from Supabase
 */
export async function getSupabaseSession() {
  if (!supabase) {
    return { session: null, error: new Error('Supabase not configured') };
  }
  
  const { data: { session }, error } = await supabase.auth.getSession();
  return { session, error };
}

/**
 * Wrapper that checks if Supabase admin client is available
 * Throws a helpful error if not configured
 */
export function requireSupabaseAdmin(): SupabaseClient<Database> {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase admin client not configured. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }
  return supabaseAdmin;
}

/**
 * Wrapper that checks if Supabase client is available
 */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      'Supabase client not configured. ' +
      'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }
  return supabase;
}

