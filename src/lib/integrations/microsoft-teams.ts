import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { requireSupabaseAdmin } from '@/lib/supabase/client';
import type { CalendarEvent, CalendarEventStatus, FreeBusySlot } from '@/types';

// Microsoft OAuth configuration
const clientId = process.env.MICROSOFT_CLIENT_ID;
const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
const tenantId = process.env.MICROSOFT_TENANT_ID;
const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

// Check if Microsoft OAuth is configured
export const isMicrosoftConfigured = !!(clientId && clientSecret && tenantId && redirectUri);

// MSAL configuration
const msalConfig = isMicrosoftConfigured
  ? {
      auth: {
        clientId: clientId!,
        clientSecret: clientSecret!,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    }
  : null;

// Create MSAL client only if configured
const msalClient = msalConfig
  ? new ConfidentialClientApplication(msalConfig)
  : null;

// Scopes required for Teams/Calendar access
const scopes = [
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/OnlineMeetings.ReadWrite',
  'https://graph.microsoft.com/User.Read',
];

/**
 * Generate Microsoft OAuth authorization URL
 */
export function getMicrosoftAuthUrl(userId: string): string {
  if (!isMicrosoftConfigured) {
    throw new Error(
      'Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, and MICROSOFT_REDIRECT_URI.'
    );
  }

  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set('client_id', clientId!);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri!);
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('state', userId);
  authUrl.searchParams.set('response_mode', 'query');

  return authUrl.toString();
}

/**
 * Handle OAuth callback and store tokens
 */
export async function handleMicrosoftCallback(
  code: string,
  userId: string
): Promise<void> {
  if (!msalClient) {
    throw new Error('Microsoft OAuth not configured');
  }

  const supabaseAdmin = requireSupabaseAdmin();

  try {
    // Exchange code for tokens
    const tokenResponse = await msalClient.acquireTokenByCode({
      code,
      scopes,
      redirectUri: redirectUri!,
    });

    if (!tokenResponse) {
      throw new Error('Failed to acquire token');
    }

    // Get user's profile ID
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single() as { data: { id: string } | null; error: Error | null };

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Store tokens in database
    const tokenData = {
      user_id: profile.id,
      platform: 'microsoft',
      access_token: tokenResponse.accessToken,
      // MSAL handles refresh tokens internally, but we can store expiration
      expires_at: tokenResponse.expiresOn
        ? tokenResponse.expiresOn.toISOString()
        : null,
      updated_at: new Date().toISOString(),
    };
    
    const { error: upsertError } = await supabaseAdmin
      .from('meeting_integrations')
      .upsert(tokenData as never);

    if (upsertError) {
      console.error('Error storing Microsoft tokens:', upsertError);
      throw new Error('Failed to store Microsoft credentials');
    }
  } catch (error) {
    console.error('Error handling Microsoft callback:', error);
    throw new Error('Failed to complete Microsoft authentication');
  }
}

/**
 * Get authenticated Graph client for a user
 */
async function getGraphClient(profileId: string): Promise<Client> {
  const supabaseAdmin = requireSupabaseAdmin();

  // Get stored tokens
  const { data: integration, error } = await supabaseAdmin
    .from('meeting_integrations')
    .select('*')
    .eq('user_id', profileId)
    .eq('platform', 'microsoft')
    .single() as { 
      data: { 
        access_token: string; 
        expires_at: string | null 
      } | null; 
      error: Error | null 
    };

  if (error || !integration) {
    throw new Error('Microsoft account not connected. Please connect your Microsoft account first.');
  }

  // Check if token is expired
  const expiresAt = integration.expires_at
    ? new Date(integration.expires_at).getTime()
    : 0;

  if (expiresAt && expiresAt < Date.now()) {
    throw new Error('Microsoft authorization expired. Please reconnect your account.');
  }

  // Create Graph client with the stored access token
  const client = Client.init({
    authProvider: (done) => {
      done(null, integration.access_token);
    },
  });

  return client;
}

/**
 * Create a Microsoft Teams meeting
 */
export async function createTeamsMeeting(
  profileId: string,
  guestEmail: string,
  title: string,
  startTime: Date,
  durationMinutes: number = 30
): Promise<{ meetingLink: string; meetingId: string }> {
  const client = await getGraphClient(profileId);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  try {
    // Create online meeting
    const meeting = await client.api('/me/onlineMeetings').post({
      startDateTime: startTime.toISOString(),
      endDateTime: endTime.toISOString(),
      subject: title,
      participants: {
        attendees: [
          {
            upn: guestEmail,
            role: 'attendee',
          },
        ],
      },
    });

    // Also create calendar event with the meeting link
    await client.api('/me/calendar/events').post({
      subject: title,
      body: {
        contentType: 'HTML',
        content: `<p>Meeting scheduled via Jynx - Leadership Networking</p>
                  <p><a href="${meeting.joinWebUrl}">Join Microsoft Teams Meeting</a></p>`,
      },
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: [
        {
          emailAddress: { address: guestEmail },
          type: 'required',
        },
      ],
      isOnlineMeeting: true,
      onlineMeetingProvider: 'teamsForBusiness',
    });

    return {
      meetingLink: meeting.joinWebUrl,
      meetingId: meeting.id,
    };
  } catch (error) {
    console.error('Error creating Teams meeting:', error);
    throw new Error('Failed to create Microsoft Teams meeting');
  }
}

/**
 * Check if user has Microsoft account connected
 */
export async function isMicrosoftConnected(profileId: string): Promise<boolean> {
  const supabaseAdmin = requireSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('meeting_integrations')
    .select('id')
    .eq('user_id', profileId)
    .eq('platform', 'microsoft')
    .single();

  return !error && !!data;
}

/**
 * Disconnect Microsoft account
 */
export async function disconnectMicrosoft(profileId: string): Promise<void> {
  const supabaseAdmin = requireSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('meeting_integrations')
    .delete()
    .eq('user_id', profileId)
    .eq('platform', 'microsoft');

  if (error) {
    console.error('Error disconnecting Microsoft:', error);
    throw new Error('Failed to disconnect Microsoft account');
  }
}

// ============================================
// Calendar Read Functions
// ============================================

interface MsGraphEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  showAs: string;
}

interface MsScheduleItem {
  status: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

function mapOutlookStatus(showAs?: string): CalendarEventStatus {
  switch (showAs) {
    case 'tentative': return 'tentative';
    case 'free':
    case 'workingElsewhere': return 'confirmed';
    default: return 'confirmed';
  }
}

/**
 * Fetch calendar events from Outlook Calendar for a date range.
 * Returns the user's own events with titles.
 */
export async function getOutlookCalendarEvents(
  profileId: string,
  timeMin: Date,
  timeMax: Date
): Promise<CalendarEvent[]> {
  const client = await getGraphClient(profileId);

  try {
    const response = await client
      .api('/me/calendarView')
      .query({
        startDateTime: timeMin.toISOString(),
        endDateTime: timeMax.toISOString(),
        $select: 'id,subject,start,end,isAllDay,showAs',
        $orderby: 'start/dateTime',
        $top: 250,
      })
      .get();

    return (response.value || []).map((event: MsGraphEvent) => ({
      id: event.id,
      title: event.subject || '(No title)',
      startTime: new Date(event.start.dateTime + 'Z'),
      endTime: new Date(event.end.dateTime + 'Z'),
      isAllDay: event.isAllDay || false,
      status: mapOutlookStatus(event.showAs),
      source: 'teams' as const,
    }));
  } catch (error) {
    console.error('Error fetching Outlook Calendar events:', error);
    throw new Error('Failed to fetch Outlook Calendar events');
  }
}

/**
 * Check free/busy for an Outlook user via Microsoft Graph schedule API.
 * Used to check availability without exposing event details.
 */
export async function getOutlookFreeBusy(
  profileId: string,
  userEmail: string,
  timeMin: Date,
  timeMax: Date
): Promise<FreeBusySlot[]> {
  const client = await getGraphClient(profileId);

  try {
    const response = await client
      .api('/me/calendar/getSchedule')
      .post({
        schedules: [userEmail],
        startTime: { dateTime: timeMin.toISOString(), timeZone: 'UTC' },
        endTime: { dateTime: timeMax.toISOString(), timeZone: 'UTC' },
        availabilityViewInterval: 15,
      });

    const schedule = response.value?.[0];
    if (!schedule?.scheduleItems) return [];

    return schedule.scheduleItems
      .filter((item: MsScheduleItem) => item.status !== 'free')
      .map((item: MsScheduleItem) => ({
        startTime: new Date(item.start.dateTime + 'Z'),
        endTime: new Date(item.end.dateTime + 'Z'),
        status: item.status === 'tentative' ? 'tentative' as const : 'busy' as const,
      }));
  } catch (error) {
    console.error('Error fetching Outlook free/busy:', error);
    throw new Error('Failed to fetch Outlook availability');
  }
}

