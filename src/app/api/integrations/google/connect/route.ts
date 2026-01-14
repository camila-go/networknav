import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl, isGoogleConfigured } from '@/lib/integrations/google-meet';
import { authenticateRequest } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    // Check if Google OAuth is configured
    if (!isGoogleConfigured) {
      return NextResponse.json(
        { 
          error: 'Google OAuth not configured',
          hint: 'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in .env.local'
        },
        { status: 503 }
      );
    }

    // Authenticate user
    const user = await authenticateRequest(req);
    
    // Generate OAuth URL
    const authUrl = getGoogleAuthUrl(user.id);

    return NextResponse.json({ authUrl });
  } catch (error: unknown) {
    console.error('Google connect error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to generate Google auth URL' },
      { status: 500 }
    );
  }
}

