import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { authenticateRequest, getUserProfile } from '@/lib/auth/middleware';
import { reportUserSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { z } from 'zod';

/**
 * POST /api/users/report - Report a user
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

    // Rate limiting - 5 reports per day
    const rateLimit = await checkRateLimit(user.id, 'report-user');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reports. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const { reportedUserId, reason, description } = reportUserSchema.parse(body);

    // Get current user's profile
    const profile = await getUserProfile(user.id);

    // Prevent self-reporting
    if (reportedUserId === profile.id) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      );
    }

    // Verify reported user exists
    const { data: reportedProfile, error: reportedError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', reportedUserId)
      .single();

    if (reportedError || !reportedProfile) {
      return NextResponse.json(
        { error: 'User to report not found' },
        { status: 404 }
      );
    }

    // Check if already reported by this user
    const { data: existingReport, error: existingError } = await supabaseAdmin
      .from('reports')
      .select('id')
      .eq('reporter_id', profile.id)
      .eq('reported_user_id', reportedUserId)
      .eq('status', 'pending')
      .single();

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this user. Your report is pending review.' },
        { status: 400 }
      );
    }

    // Create report
    const reportData = {
      reporter_id: profile.id,
      reported_user_id: reportedUserId,
      reason,
      description: description || null,
      status: 'pending',
    };
    
    const { data: report, error: insertError } = await supabaseAdmin
      .from('reports')
      .insert(reportData as never)
      .select()
      .single() as { data: Record<string, unknown> | null; error: Error | null };

    if (insertError) {
      console.error('Error creating report:', insertError);
      throw insertError;
    }

    // Also auto-block the reported user for the reporter's safety
    await supabaseAdmin.rpc('block_user' as never, {
      blocker_id: profile.id,
      blocked_id: reportedUserId,
    } as never);

    return NextResponse.json({
      success: true,
      reportId: report?.id,
      message: 'Report submitted successfully. The user has been blocked for your safety.',
    });

  } catch (error: unknown) {
    console.error('Error reporting user:', error);

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
      { error: errorMessage || 'Failed to report user' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/report - Get user's submitted reports
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

    // Get current user's profile
    const profile = await getUserProfile(user.id);

    // Get user's reports
    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select(`
        id,
        reason,
        description,
        status,
        created_at,
        reported_user:user_profiles!reported_user_id (
          id,
          name,
          photo_url
        )
      `)
      .eq('reporter_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }

    return NextResponse.json({
      reports: reports || [],
      count: reports?.length || 0,
    });

  } catch (error: unknown) {
    console.error('Error getting reports:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to get reports' },
      { status: 500 }
    );
  }
}

