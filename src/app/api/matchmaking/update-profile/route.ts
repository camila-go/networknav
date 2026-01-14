import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { authenticateRequest, getUserProfile } from '@/lib/auth/middleware';
import { generateEmbedding, createProfileText, isOpenAIConfigured } from '@/lib/ai/embeddings';
import { profileUpdateSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { moderateProfile } from '@/lib/security/contentModeration';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Supabase.' },
        { status: 503 }
      );
    }

    const supabaseAdmin = requireSupabaseAdmin();

    // 1. Authenticate user
    const user = await authenticateRequest(req);

    // 2. Rate limiting - 5 updates per hour
    const rateLimit = await checkRateLimit(user.id, 'update-profile');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          retryAfter: rateLimit.resetTime 
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    const validatedData = profileUpdateSchema.parse(body);

    // 4. Content moderation
    const moderation = await moderateProfile({
      name: validatedData.name,
      bio: validatedData.bio || undefined,
      interests: validatedData.interests || undefined,
    });

    if (moderation.flagged) {
      return NextResponse.json(
        {
          error: 'Content contains inappropriate material',
          categories: moderation.categories,
        },
        { status: 400 }
      );
    }

    // 5. Generate embedding for profile (if OpenAI is configured)
    let embedding: number[] | null = null;
    if (isOpenAIConfigured) {
      try {
        const profileText = createProfileText({
          name: validatedData.name,
          bio: validatedData.bio || undefined,
          interests: validatedData.interests || undefined,
          location: validatedData.location || undefined,
          age: validatedData.age || undefined,
          position: validatedData.position || undefined,
          title: validatedData.title || undefined,
          company: validatedData.company || undefined,
          questionnaireData: validatedData.questionnaireData || undefined,
        });
        embedding = await generateEmbedding(profileText);
      } catch (embeddingError) {
        console.warn('Failed to generate embedding:', embeddingError);
        // Continue without embedding - matching will be limited
      }
    }

    // 6. Check for existing profile
    let profileId: string | null = null;
    try {
      const existingProfile = await getUserProfile(user.id);
      profileId = existingProfile.id;
    } catch {
      // Profile doesn't exist, will be created
    }

    // 7. Update or insert profile
    const profileData: Record<string, unknown> = {
      user_id: user.id,
      email: user.email,
      name: validatedData.name,
      bio: validatedData.bio,
      interests: validatedData.interests,
      location: validatedData.location,
      age: validatedData.age,
      position: validatedData.position,
      title: validatedData.title,
      company: validatedData.company,
      photo_url: validatedData.photoUrl,
      questionnaire_data: validatedData.questionnaireData,
      updated_at: new Date().toISOString(),
    };

    // Only include embedding if generated
    if (embedding) {
      profileData.profile_embedding = embedding;
    }

    // Include ID if updating existing profile
    if (profileId) {
      profileData.id = profileId;
    }

    // Use type assertion for dynamic profile data
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData as never)
      .select()
      .single() as { data: Record<string, unknown> | null; error: Error | null };

    if (error) {
      console.error('Error upserting profile:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile?.id,
        name: profile?.name,
        bio: profile?.bio,
        interests: profile?.interests,
        location: profile?.location,
        age: profile?.age,
        position: profile?.position,
        title: profile?.title,
        company: profile?.company,
      },
      embeddingGenerated: !!embedding,
    });

  } catch (error: unknown) {
    console.error('Error updating profile:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('authorization') || errorMessage.includes('token')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: errorMessage || 'Internal server error' },
      { status: 500 }
    );
  }
}

