import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { authenticateRequest, getUserProfile } from '@/lib/auth/middleware';
import { blockUserSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { z } from 'zod';

/**
 * POST /api/users/block - Block a user
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabaseAdmin = requireSupabaseAdmin();

    // Authenticate user
    const user = await authenticateRequest(req);

    // Rate limiting
    const rateLimit = await checkRateLimit(user.id, 'block-user');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { blockedUserId } = blockUserSchema.parse(body);

    // Get current user's profile
    const profile = await getUserProfile(user.id);

    // Prevent self-blocking
    if (blockedUserId === profile.id) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    // Verify blocked user exists
    const { data: blockedProfile, error: blockedError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', blockedUserId)
      .single();

    if (blockedError || !blockedProfile) {
      return NextResponse.json(
        { error: 'User to block not found' },
        { status: 404 }
      );
    }

    // Call the block_user function
    const { error: blockError } = await supabaseAdmin
      .rpc('block_user' as never, {
        blocker_id: profile.id,
        blocked_id: blockedUserId,
      } as never) as { error: Error | null };

    if (blockError) {
      console.error('Error blocking user:', blockError);
      throw blockError;
    }

    // Also remove any existing matches between these users
    await supabaseAdmin
      .from('matches')
      .delete()
      .or(`user_id.eq.${profile.id},matched_user_id.eq.${profile.id}`);

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Error blocking user:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to block user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/block - Unblock a user
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabaseAdmin = requireSupabaseAdmin();

    // Authenticate user
    const user = await authenticateRequest(req);

    // Parse and validate request body
    const body = await req.json();
    const { blockedUserId } = blockUserSchema.parse(body);

    // Get current user's profile
    const profile = await getUserProfile(user.id);

    // Call the unblock_user function
    const { error: unblockError } = await supabaseAdmin
      .rpc('unblock_user' as never, {
        blocker_id: profile.id,
        blocked_id: blockedUserId,
      } as never) as { error: Error | null };

    if (unblockError) {
      console.error('Error unblocking user:', unblockError);
      throw unblockError;
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Error unblocking user:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to unblock user' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/block - Get list of blocked users
 */
export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabaseAdmin = requireSupabaseAdmin();

    // Authenticate user
    const user = await authenticateRequest(req);

    // Get current user's profile with blocked users
    const profile = await getUserProfile(user.id);

    const blockedUserIds = profile.blocked_users || [];

    if (blockedUserIds.length === 0) {
      return NextResponse.json({ blockedUsers: [], count: 0 });
    }

    // Get details of blocked users
    const { data: blockedUsers, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, photo_url, position, company')
      .in('id', blockedUserIds);

    if (error) {
      console.error('Error fetching blocked users:', error);
      throw error;
    }

    return NextResponse.json({
      blockedUsers: blockedUsers || [],
      count: blockedUsers?.length || 0,
    });

  } catch (error: unknown) {
    console.error('Error getting blocked users:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to get blocked users' },
      { status: 500 }
    );
  }
}

