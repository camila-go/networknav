import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateMatches, calculateMatchQualityMetrics } from "@/lib/matching";
import { users, questionnaireResponses, userMatches } from "@/lib/stores";
import type { Match } from "@/types";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user has existing matches
    let matches = userMatches.get(session.userId);

    // If no matches or matches are stale, generate new ones
    if (!matches || matches.length === 0) {
      matches = await generateMatchesForUser(session.userId, session.email);
      userMatches.set(session.userId, matches);
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
        "Ask Sarah about her experience scaling engineering teams from 20 to 100+",
        "Compare notes on your approaches to talent retention in tech",
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
        "Marcus's people expertise could help with your talent retention challenges",
        "Discuss the intersection of tech and culture in scaling organizations",
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
        "Elena just closed Series B - ask about her fundraising journey",
        "Compare your approaches to building executive teams",
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
        "David has been implementing OKRs - ask about his experience",
        "Discuss product-engineering collaboration strategies",
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
        "Learn how Aisha approaches fintech compliance challenges",
        "Explore cross-industry perspectives on digital transformation",
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
        "James excels at process optimization - valuable for scaling teams",
        "Discuss how to bridge tech and operations perspectives",
      ],
      score: 0.72,
      generatedAt: now,
      viewed: false,
      passed: false,
    },
  ];
}


