import { google } from 'googleapis';
import { requireSupabaseAdmin } from '@/lib/supabase/client';

// OAuth2 client configuration
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

// Check if Google OAuth is configured
export const isGoogleConfigured = !!(clientId && clientSecret && redirectUri);

// Create OAuth2 client only if configured
const oauth2Client = isGoogleConfigured
  ? new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  : null;

/**
 * Generate Google OAuth authorization URL
 * User will be redirected here to authorize the app
 */
export function getGoogleAuthUrl(userId: string): string {
  if (!oauth2Client) {
    throw new Error(
      'Google OAuth not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.'
    );
  }

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass user ID in state for callback
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Handle OAuth callback and store tokens
 */
export async function handleGoogleCallback(
  code: string,
  userId: string
): Promise<void> {
  if (!oauth2Client) {
    throw new Error('Google OAuth not configured');
  }

  const supabaseAdmin = requireSupabaseAdmin();

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);

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
    platform: 'google',
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token || null,
    expires_at: tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  };
  
  const { error: upsertError } = await supabaseAdmin
    .from('meeting_integrations')
    .upsert(tokenData as never);

  if (upsertError) {
    console.error('Error storing Google tokens:', upsertError);
    throw new Error('Failed to store Google credentials');
  }
}

/**
 * Get authenticated OAuth client for a user
 */
async function getAuthenticatedClient(profileId: string) {
  if (!oauth2Client) {
    throw new Error('Google OAuth not configured');
  }

  const supabaseAdmin = requireSupabaseAdmin();

  // Get stored tokens
  const { data: integration, error } = await supabaseAdmin
    .from('meeting_integrations')
    .select('*')
    .eq('user_id', profileId)
    .eq('platform', 'google')
    .single() as { 
      data: { 
        access_token: string; 
        refresh_token: string | null; 
        expires_at: string | null 
      } | null; 
      error: Error | null 
    };

  if (error || !integration) {
    throw new Error('Google account not connected. Please connect your Google account first.');
  }

  // Create a new client instance with the stored credentials
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
  });

  // Check if token is expired and refresh if needed
  const expiresAt = integration.expires_at
    ? new Date(integration.expires_at).getTime()
    : 0;
  
  if (expiresAt && expiresAt < Date.now()) {
    try {
      const { credentials } = await client.refreshAccessToken();
      
      // Update stored tokens
      const updateData = {
        access_token: credentials.access_token!,
        expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };
      
      await supabaseAdmin
        .from('meeting_integrations')
        .update(updateData as never)
        .eq('user_id', profileId)
        .eq('platform', 'google');

      client.setCredentials(credentials);
    } catch (refreshError) {
      console.error('Error refreshing Google token:', refreshError);
      throw new Error('Google authorization expired. Please reconnect your account.');
    }
  }

  return client;
}

/**
 * Create a Google Meet meeting
 */
export async function createGoogleMeetMeeting(
  profileId: string,
  guestEmail: string,
  title: string,
  startTime: Date,
  durationMinutes: number = 30
): Promise<{ meetingLink: string; eventId: string }> {
  const client = await getAuthenticatedClient(profileId);
  const calendar = google.calendar({ version: 'v3', auth: client });

  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  const event = {
    summary: title,
    description: 'Meeting scheduled via Jynx - Leadership Networking',
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/New_York',
    },
    attendees: [{ email: guestEmail }],
    conferenceData: {
      createRequest: {
        requestId: `jynx-meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: event,
    });

    if (!response.data.hangoutLink) {
      throw new Error('Failed to create Google Meet link');
    }

    return {
      meetingLink: response.data.hangoutLink,
      eventId: response.data.id!,
    };
  } catch (error) {
    console.error('Error creating Google Meet:', error);
    throw new Error('Failed to create Google Meet meeting');
  }
}

/**
 * Check if user has Google account connected
 */
export async function isGoogleConnected(profileId: string): Promise<boolean> {
  const supabaseAdmin = requireSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from('meeting_integrations')
    .select('id')
    .eq('user_id', profileId)
    .eq('platform', 'google')
    .single();

  return !error && !!data;
}

/**
 * Disconnect Google account
 */
export async function disconnectGoogle(profileId: string): Promise<void> {
  const supabaseAdmin = requireSupabaseAdmin();

  const { error } = await supabaseAdmin
    .from('meeting_integrations')
    .delete()
    .eq('user_id', profileId)
    .eq('platform', 'google');

  if (error) {
    console.error('Error disconnecting Google:', error);
    throw new Error('Failed to disconnect Google account');
  }
}

