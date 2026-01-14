import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Environment variable validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

/**
 * Client-side Supabase client (safe for browser)
 * Uses anon key with Row Level Security
 */
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : null;

/**
 * Server-side Supabase client with elevated permissions
 * ONLY use in API routes - never expose to client
 */
export const supabaseAdmin: SupabaseClient<Database> | null = 
  supabaseUrl && supabaseServiceRoleKey
    ? createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
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

