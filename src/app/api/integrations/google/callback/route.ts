import { NextRequest, NextResponse } from 'next/server';
import { handleGoogleCallback, isGoogleConfigured } from '@/lib/integrations/google-meet';

export async function GET(req: NextRequest) {
  try {
    // Check if Google OAuth is configured
    if (!isGoogleConfigured) {
      return NextResponse.redirect(
        new URL('/settings?error=Google+OAuth+not+configured', req.url)
      );
    }

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state'); // User ID
    const error = req.nextUrl.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings?error=Missing+authorization+code+or+state', req.url)
      );
    }

    // Process callback and store tokens
    await handleGoogleCallback(code, state);

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/settings?connected=google', req.url)
    );
  } catch (error: unknown) {
    console.error('Google callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.redirect(
      new URL(`/settings?error=${encodeURIComponent(errorMessage)}`, req.url)
    );
  }
}

