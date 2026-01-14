import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { authenticateRequest, getUserProfile, getProfileById } from '@/lib/auth/middleware';
import { createGoogleMeetMeeting, isGoogleConfigured, isGoogleConnected } from '@/lib/integrations/google-meet';
import { createTeamsMeeting, isMicrosoftConfigured, isMicrosoftConnected } from '@/lib/integrations/microsoft-teams';
import { meetingScheduleSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { z } from 'zod';

export async function POST(req: NextRequest) {
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

    // Rate limiting
    const rateLimit = await checkRateLimit(user.id, 'schedule-meeting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = meetingScheduleSchema.parse(body);
    const { matchedUserId, platform, title, startTime, durationMinutes } = validatedData;

    // Get user's profile
    const hostProfile = await getUserProfile(user.id);

    // Get matched user's profile
    let guestProfile;
    try {
      guestProfile = await getProfileById(matchedUserId);
    } catch {
      return NextResponse.json(
        { error: 'Matched user not found' },
        { status: 404 }
      );
    }

    // Check if guest has email
    if (!guestProfile.email) {
      return NextResponse.json(
        { error: 'Guest user does not have an email address' },
        { status: 400 }
      );
    }

    const startDateTime = new Date(startTime);

    // Create meeting based on platform
    let meetingLink: string;
    let meetingId: string;

    if (platform === 'google') {
      // Check Google integration
      if (!isGoogleConfigured) {
        return NextResponse.json(
          { error: 'Google Meet integration not configured' },
          { status: 503 }
        );
      }

      const isConnected = await isGoogleConnected(hostProfile.id);
      if (!isConnected) {
        return NextResponse.json(
          { 
            error: 'Google account not connected',
            hint: 'Connect your Google account at /api/integrations/google/connect' 
          },
          { status: 400 }
        );
      }

      const result = await createGoogleMeetMeeting(
        hostProfile.id,
        guestProfile.email,
        title,
        startDateTime,
        durationMinutes
      );
      meetingLink = result.meetingLink;
      meetingId = result.eventId;
    } else {
      // Microsoft Teams
      if (!isMicrosoftConfigured) {
        return NextResponse.json(
          { error: 'Microsoft Teams integration not configured' },
          { status: 503 }
        );
      }

      const isConnected = await isMicrosoftConnected(hostProfile.id);
      if (!isConnected) {
        return NextResponse.json(
          { 
            error: 'Microsoft account not connected',
            hint: 'Connect your Microsoft account at /api/integrations/microsoft/connect' 
          },
          { status: 400 }
        );
      }

      const result = await createTeamsMeeting(
        hostProfile.id,
        guestProfile.email,
        title,
        startDateTime,
        durationMinutes
      );
      meetingLink = result.meetingLink;
      meetingId = result.meetingId;
    }

    // Calculate end time
    const endDateTime = new Date(startDateTime.getTime() + (durationMinutes || 30) * 60000);

    // Store meeting in database
    const meetingData = {
      host_user_id: hostProfile.id,
      guest_user_id: guestProfile.id,
      platform: platform === 'google' ? 'google_meet' : 'teams',
      meeting_link: meetingLink,
      meeting_id: meetingId,
      title,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      status: 'scheduled',
    };
    
    const { data: meeting, error: insertError } = await supabaseAdmin
      .from('scheduled_meetings')
      .insert(meetingData as never)
      .select()
      .single() as { data: Record<string, unknown> | null; error: Error | null };

    if (insertError) {
      console.error('Error storing meeting:', insertError);
      // Meeting was created externally, so return success with warning
      return NextResponse.json({
        success: true,
        warning: 'Meeting created but not stored in database',
        meeting: {
          meetingLink,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting?.id,
        meetingLink: meeting?.meeting_link,
        startTime: meeting?.start_time,
        endTime: meeting?.end_time,
        platform: meeting?.platform,
      },
    });

  } catch (error: unknown) {
    console.error('Error scheduling meeting:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization') || errorMessage.includes('token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to schedule meeting' },
      { status: 500 }
    );
  }
}

