import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { authenticateRequest, getUserProfile } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabaseAdmin = requireSupabaseAdmin();

    // Authenticate user
    const user = await authenticateRequest(req);

    // Get user's profile
    let profile;
    try {
      profile = await getUserProfile(user.id);
    } catch {
      return NextResponse.json(
        { meetings: [], count: 0 },
        { status: 200 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'scheduled', 'completed', 'cancelled'
    const upcoming = searchParams.get('upcoming') === 'true';

    // Build query
    let query = supabaseAdmin
      .from('scheduled_meetings')
      .select(`
        *,
        host:user_profiles!host_user_id (
          id,
          name,
          email,
          photo_url,
          position,
          company
        ),
        guest:user_profiles!guest_user_id (
          id,
          name,
          email,
          photo_url,
          position,
          company
        )
      `)
      .or(`host_user_id.eq.${profile.id},guest_user_id.eq.${profile.id}`);

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter upcoming only
    if (upcoming) {
      query = query
        .gte('start_time', new Date().toISOString())
        .eq('status', 'scheduled');
    }

    // Order by start time
    query = query.order('start_time', { ascending: true });

    const { data: meetings, error } = await query as {
      data: Array<{
        id: string;
        host_user_id: string;
        guest_user_id: string;
        platform: string;
        meeting_link: string;
        meeting_id: string | null;
        title: string;
        start_time: string;
        end_time: string;
        status: string;
        created_at: string;
        host: Record<string, unknown>;
        guest: Record<string, unknown>;
      }> | null;
      error: Error | null;
    };

    if (error) {
      console.error('Error fetching meetings:', error);
      throw error;
    }

    // Transform to indicate if user is host or guest
    const transformedMeetings = (meetings || []).map((meeting) => ({
      ...meeting,
      isHost: meeting.host_user_id === profile.id,
      otherUser: meeting.host_user_id === profile.id ? meeting.guest : meeting.host,
    }));

    return NextResponse.json({
      meetings: transformedMeetings,
      count: transformedMeetings.length,
    });

  } catch (error: unknown) {
    console.error('Error listing meetings:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization') || errorMessage.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to list meetings' },
      { status: 500 }
    );
  }
}

