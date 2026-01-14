import { requireSupabaseAdmin } from '../supabase/client';
import type { MatchProfileResult } from '@/types/database';

/**
 * Find matches for a user based on profile embedding similarity
 * Uses pgvector for efficient similarity search
 */
export async function findMatches(
  userId: string,
  limit: number = 10,
  threshold: number = 0.5
): Promise<MatchProfileResult[]> {
  const supabaseAdmin = requireSupabaseAdmin();

  try {
    // Get user's profile and embedding
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, profile_embedding')
      .eq('id', userId)
      .single() as { 
        data: { id: string; profile_embedding: number[] | null } | null; 
        error: Error | null 
      };

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new Error('User profile not found');
    }

    if (!userProfile?.profile_embedding) {
      throw new Error('User profile embedding not found. Please update your profile first.');
    }

    // Find similar profiles using the database function
    const { data: matches, error: matchError } = await supabaseAdmin
      .rpc('match_profiles' as never, {
        query_embedding: userProfile.profile_embedding,
        match_threshold: threshold,
        match_count: limit,
        excluded_user_id: userId,
      } as never) as { data: MatchProfileResult[] | null; error: Error | null };

    if (matchError) {
      console.error('Error finding matches:', matchError);
      throw new Error('Failed to find matches');
    }

    return matches || [];
  } catch (error) {
    console.error('Error in findMatches:', error);
    throw error;
  }
}

/**
 * Save computed matches to the database
 * Replaces old matches with new ones
 */
export async function saveMatches(
  userId: string,
  matches: Array<{ id: string; similarity: number }>
): Promise<void> {
  const supabaseAdmin = requireSupabaseAdmin();

  try {
    // Prepare match records
    const matchRecords = matches.map((match) => ({
      user_id: userId,
      matched_user_id: match.id,
      similarity_score: match.similarity,
    }));

    // Delete old matches for this user
    const { error: deleteError } = await supabaseAdmin
      .from('matches')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting old matches:', deleteError);
      throw deleteError;
    }

    // Insert new matches
    if (matchRecords.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('matches')
        .insert(matchRecords as never);

      if (insertError) {
        console.error('Error inserting matches:', insertError);
        throw insertError;
      }
    }
  } catch (error) {
    console.error('Error saving matches:', error);
    throw error;
  }
}

/**
 * Get cached matches for a user from the database
 */
export async function getCachedMatches(userId: string) {
  const supabaseAdmin = requireSupabaseAdmin();

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
        photo_url
      )
    `)
    .eq('user_id', userId)
    .order('similarity_score', { ascending: false });

  if (error) {
    console.error('Error fetching cached matches:', error);
    throw error;
  }

  return matches || [];
}

/**
 * Compute matches for all users with embeddings
 * Used for background/batch processing
 */
export async function computeAllMatches(): Promise<{
  processed: number;
  failed: number;
  total: number;
}> {
  const supabaseAdmin = requireSupabaseAdmin();

  // Get all profiles with embeddings
  const { data: profiles, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .not('profile_embedding', 'is', null)
    .eq('is_active', true) as { data: Array<{ id: string }> | null; error: Error | null };

  if (error || !profiles) {
    console.error('Error fetching profiles:', error);
    return { processed: 0, failed: 0, total: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const profile of profiles) {
    try {
      const matches = await findMatches(profile.id, 10, 0.5);
      await saveMatches(profile.id, matches);
      processed++;
    } catch (error) {
      console.error(`Error processing user ${profile.id}:`, error);
      failed++;
    }
  }

  return {
    processed,
    failed,
    total: profiles.length,
  };
}

/**
 * Determine match type based on commonalities
 * High-affinity: Similar backgrounds, interests, challenges
 * Strategic: Complementary skills, different perspectives
 */
export function determineMatchType(
  similarity: number,
  userProfile: Record<string, unknown>,
  matchProfile: Record<string, unknown>
): 'high-affinity' | 'strategic' {
  // High similarity typically indicates high-affinity matches
  if (similarity >= 0.75) {
    return 'high-affinity';
  }

  // Medium similarity could be strategic if industries differ but challenges align
  const userQuestionnaire = userProfile.questionnaire_data as Record<string, unknown> | undefined;
  const matchQuestionnaire = matchProfile.questionnaire_data as Record<string, unknown> | undefined;
  const userIndustry = userQuestionnaire?.industry;
  const matchIndustry = matchQuestionnaire?.industry;

  if (userIndustry !== matchIndustry && similarity >= 0.5) {
    return 'strategic';
  }

  // Default to high-affinity for most matches
  return similarity >= 0.6 ? 'high-affinity' : 'strategic';
}

