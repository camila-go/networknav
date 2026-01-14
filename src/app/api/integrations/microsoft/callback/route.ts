import { NextRequest, NextResponse } from 'next/server';
import { handleMicrosoftCallback, isMicrosoftConfigured } from '@/lib/integrations/microsoft-teams';

export async function GET(req: NextRequest) {
  try {
    // Check if Microsoft OAuth is configured
    if (!isMicrosoftConfigured) {
      return NextResponse.redirect(
        new URL('/settings?error=Microsoft+OAuth+not+configured', req.url)
      );
    }

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state'); // User ID
    const error = req.nextUrl.searchParams.get('error');
    const errorDescription = req.nextUrl.searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(errorDescription || error)}`, req.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?error=Missing+authorization+code+or+state', req.url)
      );
    }

    // Process callback and store tokens
    await handleMicrosoftCallback(code, state);

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/settings?connected=microsoft', req.url)
    );
  } catch (error: unknown) {
    console.error('Microsoft callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(errorMessage)}`, req.url)
    );
  }
}

