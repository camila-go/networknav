import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateMatches, calculateMatchQualityMetrics } from "@/lib/matching";
import { users, questionnaireResponses, userMatches } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { generateConversationStartersAI } from "@/lib/ai/generative";
import type { Match } from "@/types";

/**
 * Generate personable, natural-sounding conversation starters for meeting invites
 */
function generatePersonableStarters(
  firstName?: string,
  company?: string,
  position?: string,
  matchType?: string
): string[] {
  const name = firstName || "you";
  const starters: string[] = [];
  
  // Role-based starters that feel like genuine curiosity
  if (position && company) {
    starters.push(`I'd love to hear what ${name}'s working on at ${company}`);
  } else if (company) {
    starters.push(`Curious to learn more about what you're building at ${company}`);
  } else if (position) {
    starters.push(`Would love to hear about your journey as a ${position}`);
  }
  
  // Match type-specific additions
  if (matchType === 'high-affinity') {
    starters.push(`Sounds like we have a lot in common — excited to connect!`);
  } else {
    starters.push(`I think we'd have interesting perspectives to share`);
  }
  
  // Warm, general fallback
  if (starters.length < 2) {
    starters.push(`Looking forward to meeting and learning from each other`);
  }
  
  return starters.slice(0, 2);
}

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
      // First try to get from Supabase if configured
      if (isSupabaseConfigured && supabaseAdmin) {
        matches = await generateMatchesFromSupabase(userId, userEmail);
        if (matches.length > 0) {
          userMatches.set(userId, matches);
        }
      }
      
      // Fall back to in-memory matching if no Supabase matches
      if (!matches || matches.length === 0) {
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

    // Force regenerate matches
    const matches = await generateMatchesForUser(session.userId, session.email);
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
      profile: {
        name: user.name,
        position: user.position,
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
        position: currentUser.position,
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
      position?: string;
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
    
    // Fetch all users from Supabase
    const { data: profiles, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, email, position, title, company, photo_url, questionnaire_data, interests')
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
    
    // Filter out the current user by ID or email
    const filteredProfiles = typedProfiles.filter(profile => {
      // Don't show if Supabase ID matches
      if (currentUserSupabaseId && profile.id === currentUserSupabaseId) return false;
      // Don't show if local ID matches
      if (profile.id === currentUserId) return false;
      // Don't show if email matches (case-insensitive)
      if (currentUserEmail && profile.email?.toLowerCase() === currentUserEmail.toLowerCase()) return false;
      // Don't show users without names
      if (!profile.name || profile.name.trim() === '') return false;
      return true;
    });
    
    if (filteredProfiles.length === 0) {
      return [];
    }

    const now = new Date();
    const matches: Match[] = filteredProfiles.map((profile, index) => {
      // Calculate a simulated score based on questionnaire completion
      const hasQuestionnaire = !!profile.questionnaire_data;
      const baseScore = hasQuestionnaire ? 0.75 : 0.6;
      const score = Math.min(0.95, baseScore + (Math.random() * 0.2));
      
      // Determine match type based on score
      const type = score > 0.8 ? 'high-affinity' : 'strategic';
      
      // Generate commonalities based on available data
      const commonalities = [];
      const qData = profile.questionnaire_data as Record<string, unknown> | null;
      
      if (qData?.industry) {
        commonalities.push({
          category: 'professional' as const,
          description: `Works in ${qData.industry}`,
          weight: 0.85,
        });
      }
      
      if (profile.position) {
        commonalities.push({
          category: 'professional' as const,
          description: `${profile.position} at ${profile.company || 'their organization'}`,
          weight: 0.8,
        });
      }
      
      if (profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0) {
        commonalities.push({
          category: 'hobby' as const,
          description: `Interested in ${profile.interests.slice(0, 2).join(' and ')}`,
          weight: 0.7,
        });
      }

      if (qData?.leadershipPhilosophy && Array.isArray(qData.leadershipPhilosophy)) {
        commonalities.push({
          category: 'values' as const,
          description: `Shares leadership values`,
          weight: 0.75,
        });
      }

      // Ensure at least some commonalities
      if (commonalities.length === 0) {
        commonalities.push({
          category: 'professional' as const,
          description: 'Fellow conference attendee',
          weight: 0.6,
        });
      }

      return {
        id: `supabase-match-${profile.id}`,
        userId: currentUserId,
        matchedUserId: profile.id,
        matchedUser: {
          id: profile.id,
          profile: {
            name: profile.name || 'Anonymous',
            position: profile.position || '',
            title: profile.title || '',
            company: profile.company,
            photoUrl: profile.photo_url,
          },
          questionnaireCompleted: hasQuestionnaire,
        },
        type,
        commonalities,
        conversationStarters: generatePersonableStarters(
          profile.name?.split(' ')[0],
          profile.company,
          profile.position,
          type
        ),
        score,
        generatedAt: now,
        viewed: false,
        passed: false,
      };
    });

    // Try AI-generated conversation starters (runs in parallel for all matches)
    try {
      const aiStarterResults = await Promise.all(
        matches.map((match) =>
          generateConversationStartersAI({
            userName: 'you',
            matchName: match.matchedUser.profile.name.split(' ')[0] || 'them',
            matchType: match.type,
            commonalities: match.commonalities.map((c) => c.description),
            matchPosition: match.matchedUser.profile.position,
            matchCompany: match.matchedUser.profile.company,
          })
        )
      );
      for (let i = 0; i < matches.length; i++) {
        const aiStarters = aiStarterResults[i];
        if (aiStarters) {
          matches[i].conversationStarters = aiStarters;
        }
      }
    } catch {
      // AI starters failed — algorithmic ones already in place
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
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
          position: "VP of Engineering",
          title: "Engineering Leader",
          company: "TechCorp",
        },
        questionnaireCompleted: true,
      },
      type: "high-affinity",
      commonalities: [
        { category: "professional", description: "Both in Technology industry", weight: 0.9 },
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
          position: "Chief People Officer",
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
          position: "CEO",
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
          position: "VP of Product",
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
          position: "CTO",
          title: "Technology Executive",
          company: "FinanceFlow",
        },
        questionnaireCompleted: true,
      },
      type: "strategic",
      commonalities: [
        { category: "professional", description: "Complementary industries: Tech + Finance", weight: 0.85 },
        { category: "professional", description: "Both driving digital transformation", weight: 0.8 },
        { category: "values", description: "Data-driven decision making", weight: 0.7 },
      ],
      conversationStarters: [
        "I'm curious how you navigate fintech compliance — seems like a unique challenge",
        "Would love a cross-industry perspective on digital transformation",
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
          position: "Director of Operations",
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


