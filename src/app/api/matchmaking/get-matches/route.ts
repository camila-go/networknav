import { NextRequest, NextResponse } from 'next/server';
import { requireSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/client';
import { authenticateRequest, getUserProfile } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Database not configured. Please set up Supabase.' },
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
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Profile not found. Please create a profile first.',
          matches: [],
          count: 0 
        },
        { status: 200 } // Return 200 with empty matches instead of 404
      );
    }

    // Get user's matches with profile details
    const { data: matches, error } = await supabaseAdmin
      .from('matches')
      .select(`
        similarity_score,
        created_at,
        matched_user:user_profiles!matched_user_id (
          id,
          name,
          bio,
          interests,
          location,
          age,
          position,
          title,
          company,
          photo_url,
          questionnaire_data
        )
      `)
      .eq('user_id', profile.id)
      .order('similarity_score', { ascending: false }) as { 
        data: Array<{
          similarity_score: number;
          created_at: string;
          matched_user: Record<string, unknown>;
        }> | null;
        error: Error | null;
      };

    if (error) {
      console.error('Error fetching matches:', error);
      throw error;
    }

    // Transform matches to include match type determination
    const transformedMatches = (matches || []).map((match) => {
      const similarity = match.similarity_score;
      const matchedUser = match.matched_user;
      
      // Determine match type based on similarity and profile comparison
      let matchType: 'high-affinity' | 'strategic' = 'high-affinity';
      
      if (similarity >= 0.75) {
        matchType = 'high-affinity';
      } else if (similarity >= 0.5) {
        // Check if different industries for strategic match
        const userQuestionnaire = profile.questionnaire_data as Record<string, unknown> | null;
        const matchQuestionnaire = matchedUser?.questionnaire_data as Record<string, unknown> | null;
        
        if (userQuestionnaire?.industry !== matchQuestionnaire?.industry) {
          matchType = 'strategic';
        }
      } else {
        matchType = 'strategic';
      }

      return {
        similarity_score: similarity,
        created_at: match.created_at,
        match_type: matchType,
        matched_user: {
          id: matchedUser?.id,
          name: matchedUser?.name,
          bio: matchedUser?.bio,
          interests: matchedUser?.interests,
          location: matchedUser?.location,
          age: matchedUser?.age,
          position: matchedUser?.position,
          title: matchedUser?.title,
          company: matchedUser?.company,
          photo_url: matchedUser?.photo_url,
        },
      };
    });

    return NextResponse.json({
      matches: transformedMatches,
      count: transformedMatches.length,
    });

  } catch (error: unknown) {
    console.error('Error getting matches:', error);

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

