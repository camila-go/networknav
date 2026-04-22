import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateMatches, calculateMatchQualityMetrics } from "@/lib/matching";
import {
  calculateMatchScore,
  determineMatchType,
  generateConversationStarters,
  hasUsableQuestionnaire,
} from "@/lib/matching/market-basket-analysis";
import { ensureMatchTypeMix, type MatchBuildRow } from "@/lib/matching/ensure-match-type-mix";
import { users, questionnaireResponses, userMatches } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { isLiveDatabaseMode } from "@/lib/supabase/data-mode";
import { generateConversationStartersAI } from "@/lib/ai/generative";
import type { Match, QuestionnaireData } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    // For demo: allow anonymous users with device ID
    const deviceId = request.cookies.get("device_id")?.value;
    const userId = session?.userId || (deviceId ? `demo_${deviceId}` : "demo_anonymous");
    let userEmail = session?.email || `demo_${deviceId || "anonymous"}@jynx.demo`;
    
    // Try to get the actual email from the users store if we have a session
    if (session?.email) {
      const user = users.get(session.email);
      if (user) {
        userEmail = user.email;
      }
    }

    // Check for refresh parameter to force new matches
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";
    
    // Check if user has existing matches
    let matches = refresh ? undefined : userMatches.get(userId);

    // If no matches or matches are stale, generate new ones
    if (!matches || matches.length === 0) {
      if (isLiveDatabaseMode() && supabaseAdmin) {
        matches = await generateMatchesFromSupabase(userId, userEmail);
        if (matches.length > 0) {
          userMatches.set(userId, matches);
        }
      } else {
        matches = await generateMatchesForUser(userId, userEmail);
        userMatches.set(userId, matches);
      }
    }

    const metrics = calculateMatchQualityMetrics(matches);

    return NextResponse.json({
      success: true,
      data: {
        matches: matches.filter((m) => !m.passed),
        metrics,
      },
    });
  } catch (error) {
    console.error("Get matches error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    let matches: Match[];
    if (isLiveDatabaseMode() && supabaseAdmin) {
      matches = await generateMatchesFromSupabase(session.userId, session.email);
    } else {
      matches = await generateMatchesForUser(session.userId, session.email);
    }
    userMatches.set(session.userId, matches);

    const metrics = calculateMatchQualityMetrics(matches);

    return NextResponse.json({
      success: true,
      data: {
        matches,
        metrics,
        message: "Matches refreshed successfully",
      },
    });
  } catch (error) {
    console.error("Refresh matches error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

async function generateMatchesForUser(
  userId: string,
  userEmail: string
): Promise<Match[]> {
  // Get current user's data
  const currentUser = users.get(userEmail);
  if (!currentUser) {
    return [];
  }

  const currentUserResponses = questionnaireResponses.get(userId);
  if (!currentUserResponses) {
    return [];
  }

  // Build candidate pool from all users with completed questionnaires
  const candidates = [];
  for (const [email, user] of users.entries()) {
    if (email === userEmail) continue;
    if (!user.questionnaireCompleted) continue;

    const responses = questionnaireResponses.get(user.id);
    if (!responses) continue;

    candidates.push({
      id: user.id,
      email: email,
      profile: {
        name: user.name,
        title: user.title,
        company: user.company,
        photoUrl: undefined,
      },
      responses: responses.responses as Record<string, unknown>,
    });
  }

  // If no other users, return mock matches for demo
  if (candidates.length === 0) {
    return generateDemoMatches(userId);
  }

  // Generate real matches
  const matches = generateMatches(
    {
      id: userId,
      profile: {
        name: currentUser.name,
        title: currentUser.title,
        company: currentUser.company,
      },
      responses: currentUserResponses.responses as Record<string, unknown>,
    },
    candidates
  );

  return matches;
}

async function generateMatchesFromSupabase(currentUserId: string, currentUserEmail?: string): Promise<Match[]> {
  if (!supabaseAdmin) return [];
  
  try {
    // Type for user profile from Supabase
    type SupabaseProfile = {
      id: string;
      name: string;
      email?: string;
      title?: string;
      company?: string;
      photo_url?: string;
      questionnaire_data?: Record<string, unknown>;
      interests?: string[];
    };

    // First, try to find the current user's Supabase profile by either ID or email
    let currentUserSupabaseId: string | null = null;
    
    // Try to find by ID first (if it's a UUID)
    if (currentUserId && currentUserId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: idMatch } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', currentUserId)
        .single();
      if (idMatch) currentUserSupabaseId = (idMatch as { id: string }).id;
    }
    
    // If not found by ID and we have an email, try to find by email
    if (!currentUserSupabaseId && currentUserEmail && !currentUserEmail.includes('@jynx.demo')) {
      const { data: emailMatch } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email')
        .eq('email', currentUserEmail.toLowerCase())
        .single();
      if (emailMatch) currentUserSupabaseId = (emailMatch as { id: string; email: string }).id;
    }
    
    // Fetch current user's questionnaire data for real MBA scoring
    let currentUserQuestionnaire: Partial<QuestionnaireData> | null = null;
    let currentViewerFirstName: string | undefined;
    if (currentUserSupabaseId) {
      const { data: currentProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('questionnaire_data, name')
        .eq('id', currentUserSupabaseId)
        .single();
      if (currentProfile) {
        const row = currentProfile as {
          questionnaire_data?: Record<string, unknown>;
          name?: string;
        };
        currentUserQuestionnaire =
          (row.questionnaire_data as Partial<QuestionnaireData>) ?? null;
        currentViewerFirstName = row.name?.trim().split(/\s+/)[0];
      }
    }
    if (!currentViewerFirstName && currentUserEmail && !currentUserEmail.includes("@jynx.demo")) {
      currentViewerFirstName = currentUserEmail.split("@")[0]?.replace(/[._]/g, " ");
    }

    // Fetch all users from Supabase
    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, email, title, company, photo_url, questionnaire_data, interests')
      .eq('is_active', true)
      .limit(30);

    if (error) {
      console.error('Supabase query error:', error);
      return [];
    }
    
    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Cast to typed array
    const typedProfiles = profiles as unknown as SupabaseProfile[];
    
    // Filter out the current user by ID or email - be aggressive about excluding self
    const filteredProfiles = typedProfiles.filter(profile => {
      // Don't show if Supabase ID matches
      if (currentUserSupabaseId && profile.id === currentUserSupabaseId) return false;
      // Don't show if local ID matches (with or without demo_ prefix)
      if (profile.id === currentUserId) return false;
      if (currentUserId.startsWith('demo_') && profile.id === currentUserId.replace('demo_', '')) return false;
      // Don't show if email matches (case-insensitive)
      if (currentUserEmail && profile.email?.toLowerCase() === currentUserEmail.toLowerCase()) return false;
      // Also check if profile email is in the currentUserId (for demo users)
      if (profile.email && currentUserId.includes(profile.email.split('@')[0])) return false;
      // Don't show users without names
      if (!profile.name || profile.name.trim() === '') return false;
      return true;
    });
    
    if (filteredProfiles.length === 0) {
      return [];
    }

    // Log for debugging
    console.log(`Generating matches for user: ${currentUserId} (email: ${currentUserEmail})`);
    console.log(`Filtered ${typedProfiles.length} profiles down to ${filteredProfiles.length}`);

    const now = new Date();
    const viewerHasQuestionnaire = hasUsableQuestionnaire(currentUserQuestionnaire);

    const buildRows: MatchBuildRow[] = filteredProfiles.map((profile) => {
      const candidateHasQuestionnaire = hasUsableQuestionnaire(profile.questionnaire_data);
      const candidateResponses = (profile.questionnaire_data ?? {}) as Partial<QuestionnaireData>;

      let score: number;
      let type: 'high-affinity' | 'strategic';
      let commonalities: Match['commonalities'];
      let affinityScore = 0;
      let strategicScore = 0;

      if (viewerHasQuestionnaire && candidateHasQuestionnaire) {
        // Use real Market Basket Analysis algorithm (viewer questionnaire is non-null when usable)
        const matchScore = calculateMatchScore(
          currentUserQuestionnaire as Partial<QuestionnaireData>,
          candidateResponses
        );
        type = determineMatchType(matchScore);
        score = Math.min(0.95, matchScore.totalScore);
        commonalities = matchScore.commonalities;
        affinityScore = matchScore.affinityScore;
        strategicScore = matchScore.strategicScore;
      } else {
        // Fallback when questionnaire data unavailable for one or both users
        score = candidateHasQuestionnaire ? 0.65 : 0.50;
        type = 'strategic';
        commonalities = [];
        affinityScore = score;
        strategicScore = 1 - score;
      }

      // Ensure at least one commonality for display
      if (commonalities.length === 0) {
        commonalities = [{
          category: 'professional' as const,
          description: profile.title
            ? `${profile.title} at ${profile.company || 'their organization'}`
            : 'Fellow conference attendee',
          weight: 0.6,
        }];
      }

      const firstName = profile.name?.split(' ')[0];

      const match: Match = {
        id: `supabase-match-${profile.id}`,
        userId: currentUserId,
        matchedUserId: profile.id,
        matchedUser: {
          id: profile.id,
          email: profile.email,
          profile: {
            name: profile.name || 'Anonymous',
            title: profile.title || '',
            company: profile.company,
            photoUrl: profile.photo_url,
          },
          questionnaireCompleted: candidateHasQuestionnaire,
        },
        type,
        commonalities,
        conversationStarters: generateConversationStarters(commonalities, type, firstName, {
          theirTitle: profile.title,
          theirCompany: profile.company,
          viewerFirstName: currentViewerFirstName,
          seed: `${currentUserId}-${profile.id}`,
        }),
        score,
        generatedAt: now,
        viewed: false,
        passed: false,
      };

      return {
        match,
        affinityScore,
        strategicScore,
        meta: {
          firstName,
          title: profile.title,
          company: profile.company,
          seed: `${currentUserId}-${profile.id}`,
        },
      };
    });

    const matches = ensureMatchTypeMix(buildRows, currentViewerFirstName);

    // Optional AI layer: merge with template starters so lines stay varied even when AI is generic.
    // Bounded concurrency (3 at a time) so a rate-limit spike doesn't burn the free-tier daily
    // quota across every match card on a single page render.
    try {
      const aiStarterResults: (string[] | null)[] = new Array(matches.length).fill(null);
      const CONCURRENCY = 3;
      for (let i = 0; i < matches.length; i += CONCURRENCY) {
        const batch = matches.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map((match) =>
            generateConversationStartersAI({
              userName: currentViewerFirstName || "there",
              matchName: match.matchedUser.profile.name.split(" ")[0] || "them",
              matchType: match.type,
              commonalities: match.commonalities.map((c) => c.description),
              matchPosition: match.matchedUser.profile.title,
              matchCompany: match.matchedUser.profile.company,
              viewerId: currentUserSupabaseId ?? undefined,
              matchId: match.matchedUserId,
            })
          )
        );
        for (let j = 0; j < results.length; j++) {
          aiStarterResults[i + j] = results[j];
        }
      }
      for (let i = 0; i < matches.length; i++) {
        const aiStarters = aiStarterResults[i];
        const base = matches[i].conversationStarters;
        if (aiStarters?.length) {
          const merged = [...aiStarters.slice(0, 2), ...base].filter(
            (s, idx, arr) => s && arr.findIndex((x) => x.toLowerCase().slice(0, 40) === s.toLowerCase().slice(0, 40)) === idx
          );
          matches[i].conversationStarters = merged.slice(0, 3);
        }
      }
    } catch {
      // keep template starters
    }

    // Final safety filter - remove any matches where the matched user is the current user
    const safeMatches = matches.filter(match => {
      // Check various ways the user might appear
      if (match.matchedUserId === currentUserId) return false;
      if (currentUserSupabaseId && match.matchedUserId === currentUserSupabaseId) return false;
      if (currentUserEmail && match.matchedUser.profile.name?.toLowerCase().includes(currentUserEmail.split('@')[0].toLowerCase())) {
        // Extra check: if name contains email prefix, might be self
        console.log(`Filtering out potential self-match: ${match.matchedUser.profile.name}`);
      }
      return true;
    });

    // Sort by score descending
    return safeMatches.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error fetching matches from Supabase:', error);
    return [];
  }
}

function generateDemoMatches(userId: string): Match[] {
  // Return demo matches for when there are no other users
  const now = new Date();

  return [
    {
      id: "demo-match-1",
      userId,
      matchedUserId: "demo-user-1",
      matchedUser: {
        id: "demo-user-1",
        profile: {
          name: "Sarah Chen",
          title: "Engineering Leader",
          company: "TechCorp",
        },
        questionnaireCompleted: true,
      },
      type: "high-affinity",
      commonalities: [
        { category: "professional", description: "Both at VP / executive director level", weight: 0.9 },
        { category: "professional", description: "Similar team scaling challenges", weight: 0.85 },
        { category: "hobby", description: "Both enjoy hiking and outdoor adventures", weight: 0.7 },
        { category: "values", description: "Share servant leadership philosophy", weight: 0.8 },
      ],
      conversationStarters: [
        "I'd love to hear how you scaled your engineering team — we're going through something similar",
        "Would be great to swap notes on talent retention strategies",
      ],
      score: 0.92,
      generatedAt: now,
      viewed: false,
      passed: false,
    },
    {
      id: "demo-match-2",
      userId,
      matchedUserId: "demo-user-2",
      matchedUser: {
        id: "demo-user-2",
        profile: {
          name: "Marcus Johnson",
          title: "HR Executive",
          company: "GrowthStartup",
        },
        questionnaireCompleted: true,
      },
      type: "strategic",
      commonalities: [
        { category: "professional", description: "Complementary expertise: Tech + People", weight: 0.85 },
        { category: "professional", description: "Both focused on organizational transformation", weight: 0.8 },
        { category: "lifestyle", description: "Both value work-life integration", weight: 0.6 },
      ],
      conversationStarters: [
        "Your people expertise sounds like exactly what I need perspective on",
        "I'm curious how you think about culture as organizations scale",
      ],
      score: 0.78,
      generatedAt: now,
      viewed: false,
      passed: false,
    },
    {
      id: "demo-match-3",
      userId,
      matchedUserId: "demo-user-3",
      matchedUser: {
        id: "demo-user-3",
        profile: {
          name: "Elena Rodriguez",
          title: "Founder & CEO",
          company: "InnovateCo",
        },
        questionnaireCompleted: true,
      },
      type: "high-affinity",
      commonalities: [
        { category: "professional", description: "Both founders/entrepreneurs", weight: 0.95 },
        { category: "professional", description: "Similar growth stage challenges", weight: 0.85 },
        { category: "values", description: "Passionate about mentorship", weight: 0.75 },
      ],
      conversationStarters: [
        "Would love to hear about your fundraising journey — congrats on Series B!",
        "I'm navigating similar exec team challenges, would value your perspective",
      ],
      score: 0.89,
      generatedAt: now,
      viewed: false,
      passed: false,
    },
    {
      id: "demo-match-4",
      userId,
      matchedUserId: "demo-user-4",
      matchedUser: {
        id: "demo-user-4",
        profile: {
          name: "David Park",
          title: "Product Leader",
          company: "ScaleUp Inc",
        },
        questionnaireCompleted: true,
      },
      type: "high-affinity",
      commonalities: [
        { category: "professional", description: "Both VP-level in tech companies", weight: 0.9 },
        { category: "professional", description: "Shared focus on innovation", weight: 0.85 },
        { category: "hobby", description: "Both enjoy leadership podcasts", weight: 0.6 },
      ],
      conversationStarters: [
        "I heard you've been rolling out OKRs — I'd love to hear how it's going",
        "Would be great to trade notes on product-engineering alignment",
      ],
      score: 0.84,
      generatedAt: now,
      viewed: false,
      passed: false,
    },
    {
      id: "demo-match-5",
      userId,
      matchedUserId: "demo-user-5",
      matchedUser: {
        id: "demo-user-5",
        profile: {
          name: "Aisha Patel",
          title: "Technology Executive",
          company: "FinanceFlow",
        },
        questionnaireCompleted: true,
      },
      type: "strategic",
      commonalities: [
        { category: "professional", description: "Complementary roles: engineering + people leadership", weight: 0.85 },
        { category: "professional", description: "Both driving digital transformation", weight: 0.8 },
        { category: "values", description: "Data-driven decision making", weight: 0.7 },
      ],
      conversationStarters: [
        "I'm curious how you navigate fintech compliance — seems like a unique challenge",
        "Would love an outside perspective on digital transformation",
      ],
      score: 0.76,
      generatedAt: now,
      viewed: false,
      passed: false,
    },
    {
      id: "demo-match-6",
      userId,
      matchedUserId: "demo-user-6",
      matchedUser: {
        id: "demo-user-6",
        profile: {
          name: "James Wilson",
          title: "Operations Leader",
          company: "LogiTech Solutions",
        },
        questionnaireCompleted: true,
      },
      type: "strategic",
      commonalities: [
        { category: "professional", description: "Cross-functional expertise opportunity", weight: 0.8 },
        { category: "professional", description: "Both focused on operational excellence", weight: 0.75 },
        { category: "lifestyle", description: "Similar communication styles", weight: 0.6 },
      ],
      conversationStarters: [
        "Your ops expertise could really help with some scaling challenges I'm facing",
        "I'd value your take on bridging tech and operations — it's tricky!",
      ],
      score: 0.72,
      generatedAt: now,
      viewed: false,
      passed: false,
    },
  ];
}


