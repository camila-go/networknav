import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getUserProfile, getProfileById } from '@/lib/auth/middleware';
import { isGoogleConnected, getGoogleCalendarEvents, getGoogleFreeBusy } from '@/lib/integrations/google-meet';
import { isMicrosoftConnected, getOutlookCalendarEvents, getOutlookFreeBusy } from '@/lib/integrations/microsoft-teams';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { cache, CACHE_KEYS, CACHE_TTLS } from '@/lib/cache';
import { calendarQuerySchema } from '@/lib/validation/schemas';
import { z } from 'zod';
import type { CalendarEvent, FreeBusySlot } from '@/types';

const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000; // 31 days

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);

    const rateLimit = await checkRateLimit(user.id, 'calendar-read');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const params = calendarQuerySchema.parse({
      mode: searchParams.get('mode'),
      platform: searchParams.get('platform') || undefined,
      targetUserId: searchParams.get('targetUserId') || undefined,
      timeMin: searchParams.get('timeMin'),
      timeMax: searchParams.get('timeMax'),
    });

    const timeMin = new Date(params.timeMin);
    const timeMax = new Date(params.timeMax);

    if (timeMax.getTime() - timeMin.getTime() > MAX_RANGE_MS) {
      return NextResponse.json(
        { success: false, error: 'Date range cannot exceed 31 days' },
        { status: 400 }
      );
    }

    const profile = await getUserProfile(user.id);

    if (params.mode === 'events') {
      const cacheKey = CACHE_KEYS.CALENDAR_EVENTS(
        profile.id, params.platform || 'all', params.timeMin, params.timeMax
      );

      const events = await cache.getOrSet(cacheKey, async () => {
        return fetchCalendarEvents(profile.id, params.platform, timeMin, timeMax);
      }, CACHE_TTLS.CALENDAR_EVENTS);

      return NextResponse.json({ success: true, data: events });
    } else {
      if (!params.targetUserId) {
        return NextResponse.json(
          { success: false, error: 'targetUserId is required for availability checks' },
          { status: 400 }
        );
      }

      const cacheKey = CACHE_KEYS.CALENDAR_FREEBUSY(
        params.targetUserId, params.timeMin, params.timeMax
      );

      const availability = await cache.getOrSet(cacheKey, async () => {
        return fetchFreeBusy(params.targetUserId!, timeMin, timeMax);
      }, CACHE_TTLS.CALENDAR_EVENTS);

      return NextResponse.json({ success: true, data: availability });
    }
  } catch (error: unknown) {
    console.error('Calendar API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization') || errorMessage.includes('token')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

async function fetchCalendarEvents(
  profileId: string,
  platform: string | undefined,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const results: CalendarEvent[] = [];

  if (!platform || platform === 'google') {
    try {
      if (await isGoogleConnected(profileId)) {
        const events = await getGoogleCalendarEvents(profileId, timeMin, timeMax);
        results.push(...events);
      }
    } catch (error) {
      console.error('Error fetching Google events:', error);
    }
  }

  if (!platform || platform === 'microsoft') {
    try {
      if (await isMicrosoftConnected(profileId)) {
        const events = await getOutlookCalendarEvents(profileId, timeMin, timeMax);
        results.push(...events);
      }
    } catch (error) {
      console.error('Error fetching Outlook events:', error);
    }
  }

  results.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return results;
}

async function fetchFreeBusy(
  targetUserId: string,
  timeMin: Date,
  timeMax: Date
): Promise<{ busySlots: FreeBusySlot[]; fetchedAt: string }> {
  const busySlots: FreeBusySlot[] = [];

  // Look up the target user's profile to get their profileId and email
  let targetProfile;
  try {
    targetProfile = await getProfileById(targetUserId);
  } catch {
    return { busySlots: [], fetchedAt: new Date().toISOString() };
  }

  if (await isGoogleConnected(targetProfile.id)) {
    try {
      const slots = await getGoogleFreeBusy(targetProfile.id, timeMin, timeMax);
      busySlots.push(...slots);
    } catch (error) {
      console.error('Error fetching Google free/busy:', error);
    }
  }

  if (await isMicrosoftConnected(targetProfile.id)) {
    try {
      if (targetProfile.email) {
        const slots = await getOutlookFreeBusy(targetProfile.id, targetProfile.email, timeMin, timeMax);
        busySlots.push(...slots);
      }
    } catch (error) {
      console.error('Error fetching Outlook free/busy:', error);
    }
  }

  busySlots.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return { busySlots, fetchedAt: new Date().toISOString() };
}
