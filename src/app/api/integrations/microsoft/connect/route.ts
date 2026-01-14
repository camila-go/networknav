import { NextRequest, NextResponse } from 'next/server';
import { getMicrosoftAuthUrl, isMicrosoftConfigured } from '@/lib/integrations/microsoft-teams';
import { authenticateRequest } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    // Check if Microsoft OAuth is configured
    if (!isMicrosoftConfigured) {
      return NextResponse.json(
        { 
          error: 'Microsoft OAuth not configured',
          hint: 'Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, and MICROSOFT_REDIRECT_URI in .env.local'
        },
        { status: 503 }
      );
    }

    // Authenticate user
    const user = await authenticateRequest(req);
    
    // Generate OAuth URL
    const authUrl = getMicrosoftAuthUrl(user.id);

    return NextResponse.json({ authUrl });
  } catch (error: unknown) {
    console.error('Microsoft connect error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: errorMessage || 'Failed to generate Microsoft auth URL' },
      { status: 500 }
    );
  }
}

