import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { authenticateRequest, getUserProfile } from '@/lib/auth/middleware';
import { findMatches, saveMatches, computeAllMatches } from '@/lib/ai/matching';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { computeMatchesSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Supabase.' },
        { status: 503 }
      );
    }

    const supabaseAdmin = requireSupabaseAdmin();

    // Authenticate user
    const user = await authenticateRequest(req);

    // Rate limiting
    const rateLimit = await checkRateLimit(user.id, 'compute-matches');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimit.resetTime 
        },
        { status: 429 }
      );
    }

    // Parse request body
    let body = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine - will compute for current user
    }
    
    const validatedData = computeMatchesSchema.parse(body);
    const { userId, forAllUsers } = validatedData;

    // If specific user ID provided, compute only for them
    if (userId) {
      try {
        const matches = await findMatches(userId, 10, 0.5);
        await saveMatches(userId, matches);

        return NextResponse.json({
          success: true,
          userId,
          matchCount: matches.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
          { 
            success: false, 
            error: errorMessage,
            userId 
          },
          { status: 400 }
        );
      }
    }

    // Compute matches for all users (admin/background job)
    if (forAllUsers) {
      // TODO: Add admin role check here
      const result = await computeAllMatches();

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // Default: compute for current user
    let currentProfile;
    try {
      currentProfile = await getUserProfile(user.id);
    } catch (error) {
      return NextResponse.json(
        { error: 'Profile not found. Please create a profile first.' },
        { status: 404 }
      );
    }

    // Check if profile has embedding
    const { data: profileWithEmbedding, error: embeddingError } = await supabaseAdmin
      .from('user_profiles')
      .select('profile_embedding')
      .eq('id', currentProfile.id)
      .single() as { data: { profile_embedding: number[] | null } | null; error: Error | null };

    if (embeddingError || !profileWithEmbedding?.profile_embedding) {
      return NextResponse.json(
        { 
          error: 'Profile embedding not found. Please update your profile first.',
          hint: 'Call POST /api/matchmaking/update-profile with your profile data to generate an embedding.' 
        },
        { status: 400 }
      );
    }

    try {
      const matches = await findMatches(currentProfile.id, 10, 0.5);
      await saveMatches(currentProfile.id, matches);

      return NextResponse.json({
        success: true,
        matchCount: matches.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage 
        },
        { status: 400 }
      );
    }

  } catch (error: unknown) {
    console.error('Error computing matches:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization') || errorMessage.includes('token')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

