import { requireSupabaseAdmin, supabase } from '@/lib/supabase/client';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import type { UserProfileRow } from '@/types/database';

/**
 * Authentication result type
 */
export interface AuthenticatedUser {
  id: string;
  email?: string;
  profileId?: string;
}

/**
 * Authenticate API requests using Supabase Auth
 * Supports both Bearer token and cookie-based auth
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedUser> {
  // Try Bearer token first
  const authHeader = req.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return authenticateWithToken(token);
  }

  // Fall back to cookie-based auth (for same-origin requests)
  const cookieStore = cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;
  
  if (accessToken) {
    return authenticateWithToken(accessToken);
  }

  // Check for device_id cookie (demo/anonymous users)
  const deviceId = cookieStore.get('device_id')?.value;
  if (deviceId) {
    return {
      id: deviceId,
      email: `demo-${deviceId}@jynx.app`,
    };
  }

  throw new Error('Missing or invalid authorization');
}

/**
 * Authenticate using a JWT token from Supabase
 */
async function authenticateWithToken(token: string): Promise<AuthenticatedUser> {
  const supabaseAdmin = requireSupabaseAdmin();

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return {
    id: user.id,
    email: user.email,
  };
}

/**
 * Get user profile from Supabase by user_id
 */
export async function getUserProfile(userId: string): Promise<UserProfileRow> {
  const supabaseAdmin = requireSupabaseAdmin();

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If profile doesn't exist, throw specific error
    if (error.code === 'PGRST116') {
      throw new Error('Profile not found');
    }
    throw error;
  }

  return profile;
}

/**
 * Get user profile by profile ID
 */
export async function getProfileById(profileId: string): Promise<UserProfileRow> {
  const supabaseAdmin = requireSupabaseAdmin();

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) {
    throw error;
  }

  return profile;
}

/**
 * Check if the current user owns a profile
 */
export async function verifyProfileOwnership(
  userId: string,
  profileId: string
): Promise<boolean> {
  const supabaseAdmin = requireSupabaseAdmin();

  const { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('user_id')
    .eq('id', profileId)
    .single() as { data: { user_id: string } | null; error: Error | null };

  if (error || !profile) {
    return false;
  }

  return profile.user_id === userId;
}

/**
 * Middleware wrapper for protected API routes
 * Returns user info or throws authentication error
 */
export async function withAuth<T>(
  req: NextRequest,
  handler: (user: AuthenticatedUser) => Promise<T>
): Promise<T> {
  const user = await authenticateRequest(req);
  return handler(user);
}

/**
 * Get or create profile for authenticated user
 */
export async function getOrCreateProfile(
  userId: string,
  email?: string
): Promise<UserProfileRow> {
  const supabaseAdmin = requireSupabaseAdmin();

  // Try to get existing profile
  const { data: existingProfile, error: fetchError } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single() as { data: UserProfileRow | null; error: { code?: string; message?: string } | null };

  if (existingProfile) {
    return existingProfile;
  }

  // Create new profile if doesn't exist
  if (fetchError?.code === 'PGRST116') {
    const newProfileData = {
      user_id: userId,
      email: email,
      name: email?.split('@')[0] || 'User',
      is_active: true,
      is_visible: true,
    };
    
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert(newProfileData as never)
      .select()
      .single() as { data: UserProfileRow | null; error: Error | null };

    if (createError || !newProfile) {
      throw createError || new Error('Failed to create profile');
    }

    return newProfile;
  }

  throw fetchError;
}

