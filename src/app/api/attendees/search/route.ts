import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users, questionnaireResponses } from "@/lib/stores";
import { cookies } from "next/headers";
import type { SearchFilters, AttendeeSearchResult, Commonality, PublicUser } from "@/types";
import { QUESTIONNAIRE_SECTIONS } from "@/lib/questionnaire-data";

// Get label for a value from questionnaire options
function getLabel(questionId: string, value: string): string {
  for (const section of QUESTIONNAIRE_SECTIONS) {
    const question = section.questions.find((q) => q.id === questionId);
    if (question && question.options) {
      const option = question.options.find((o) => o.value === value);
      if (option) return option.label;
    }
  }
  return value;
}

// Calculate match percentage and commonalities between two users
function calculateMatchData(
  currentResponses: Record<string, unknown>,
  candidateResponses: Record<string, unknown>
): { percentage: number; commonalities: Commonality[] } {
  const commonalities: Commonality[] = [];
  let matchPoints = 0;
  let totalPoints = 0;

  // Industry match (high weight)
  if (currentResponses.industry && candidateResponses.industry) {
    totalPoints += 15;
    if (currentResponses.industry === candidateResponses.industry) {
      matchPoints += 15;
      commonalities.push({
        category: "professional",
        description: `Both in ${getLabel("industry", currentResponses.industry as string)}`,
        weight: 0.9,
      });
    }
  }

  // Leadership level proximity
  const levelOrder = ["emerging", "manager", "director", "vp", "senior-executive", "c-suite", "founder"];
  if (currentResponses.leadershipLevel && candidateResponses.leadershipLevel) {
    totalPoints += 10;
    const currentIdx = levelOrder.indexOf(currentResponses.leadershipLevel as string);
    const candidateIdx = levelOrder.indexOf(candidateResponses.leadershipLevel as string);
    const distance = Math.abs(currentIdx - candidateIdx);
    if (distance <= 1) {
      matchPoints += 10;
      commonalities.push({
        category: "professional",
        description: `Similar leadership level: ${getLabel("leadershipLevel", candidateResponses.leadershipLevel as string)}`,
        weight: 0.85,
      });
    } else if (distance === 2) {
      matchPoints += 5;
    }
  }

  // Organization size match
  if (currentResponses.organizationSize && candidateResponses.organizationSize) {
    totalPoints += 8;
    if (currentResponses.organizationSize === candidateResponses.organizationSize) {
      matchPoints += 8;
      commonalities.push({
        category: "professional",
        description: `Both at ${getLabel("organizationSize", currentResponses.organizationSize as string)} organizations`,
        weight: 0.7,
      });
    }
  }

  // Leadership priorities overlap
  const currentPriorities = (currentResponses.leadershipPriorities as string[]) || [];
  const candidatePriorities = (candidateResponses.leadershipPriorities as string[]) || [];
  if (currentPriorities.length > 0 && candidatePriorities.length > 0) {
    totalPoints += 15;
    const sharedPriorities = currentPriorities.filter((p) => candidatePriorities.includes(p));
    matchPoints += Math.min(sharedPriorities.length * 3, 15);
    if (sharedPriorities.length > 0) {
      commonalities.push({
        category: "professional",
        description: `Shared priorities: ${sharedPriorities.slice(0, 2).map((p) => getLabel("leadershipPriorities", p)).join(", ")}`,
        weight: 0.85,
      });
    }
  }

  // Leadership challenges overlap
  const currentChallenges = (currentResponses.leadershipChallenges as string[]) || [];
  const candidateChallenges = (candidateResponses.leadershipChallenges as string[]) || [];
  if (currentChallenges.length > 0 && candidateChallenges.length > 0) {
    totalPoints += 15;
    const sharedChallenges = currentChallenges.filter((c) => candidateChallenges.includes(c));
    matchPoints += Math.min(sharedChallenges.length * 3, 15);
    if (sharedChallenges.length > 0) {
      commonalities.push({
        category: "professional",
        description: `Similar challenges: ${sharedChallenges.slice(0, 2).map((c) => getLabel("leadershipChallenges", c)).join(", ")}`,
        weight: 0.9,
      });
    }
  }

  // Recharge activities overlap (hobbies)
  const currentRecharge = (currentResponses.rechargeActivities as string[]) || [];
  const candidateRecharge = (candidateResponses.rechargeActivities as string[]) || [];
  if (currentRecharge.length > 0 && candidateRecharge.length > 0) {
    totalPoints += 12;
    const sharedRecharge = currentRecharge.filter((r) => candidateRecharge.includes(r));
    matchPoints += Math.min(sharedRecharge.length * 2, 12);
    if (sharedRecharge.length > 0) {
      commonalities.push({
        category: "hobby",
        description: `Both enjoy ${sharedRecharge.slice(0, 2).map((r) => getLabel("rechargeActivities", r)).join(" and ")}`,
        weight: 0.7,
      });
    }
  }

  // Content preferences overlap
  const currentContent = (currentResponses.contentPreferences as string[]) || [];
  const candidateContent = (candidateResponses.contentPreferences as string[]) || [];
  if (currentContent.length > 0 && candidateContent.length > 0) {
    totalPoints += 8;
    const sharedContent = currentContent.filter((c) => candidateContent.includes(c));
    matchPoints += Math.min(sharedContent.length * 2, 8);
    if (sharedContent.length > 0) {
      commonalities.push({
        category: "hobby",
        description: `Shared interest in ${sharedContent.slice(0, 2).map((c) => getLabel("contentPreferences", c)).join(", ")}`,
        weight: 0.6,
      });
    }
  }

  // Leadership philosophy overlap
  const currentPhilosophy = (currentResponses.leadershipPhilosophy as string[]) || [];
  const candidatePhilosophy = (candidateResponses.leadershipPhilosophy as string[]) || [];
  if (currentPhilosophy.length > 0 && candidatePhilosophy.length > 0) {
    totalPoints += 12;
    const sharedPhilosophy = currentPhilosophy.filter((p) => candidatePhilosophy.includes(p));
    matchPoints += Math.min(sharedPhilosophy.length * 3, 12);
    if (sharedPhilosophy.length > 0) {
      commonalities.push({
        category: "values",
        description: `Share ${sharedPhilosophy.slice(0, 2).map((p) => getLabel("leadershipPhilosophy", p)).join(" and ")} philosophy`,
        weight: 0.85,
      });
    }
  }

  // Communication style match
  if (currentResponses.communicationStyle && candidateResponses.communicationStyle) {
    totalPoints += 5;
    if (currentResponses.communicationStyle === candidateResponses.communicationStyle) {
      matchPoints += 5;
      commonalities.push({
        category: "values",
        description: `Similar communication style: ${getLabel("communicationStyle", currentResponses.communicationStyle as string)}`,
        weight: 0.75,
      });
    }
  }

  const percentage = totalPoints > 0 ? Math.round((matchPoints / totalPoints) * 100) : 0;
  
  // Sort commonalities by weight and limit to top 5
  commonalities.sort((a, b) => b.weight - a.weight);
  
  return { percentage, commonalities: commonalities.slice(0, 5) };
}

// Check if user matches filters
function matchesFilters(
  responses: Record<string, unknown>,
  userProfile: { location?: string },
  filters: SearchFilters
): boolean {
  // Industry filter
  if (filters.industries && filters.industries.length > 0) {
    if (!responses.industry || !filters.industries.includes(responses.industry as string)) {
      return false;
    }
  }

  // Leadership level filter
  if (filters.leadershipLevels && filters.leadershipLevels.length > 0) {
    if (!responses.leadershipLevel || !filters.leadershipLevels.includes(responses.leadershipLevel as string)) {
      return false;
    }
  }

  // Organization size filter
  if (filters.organizationSizes && filters.organizationSizes.length > 0) {
    if (!responses.organizationSize || !filters.organizationSizes.includes(responses.organizationSize as string)) {
      return false;
    }
  }

  // Years experience filter
  if (filters.yearsExperience && filters.yearsExperience.length > 0) {
    if (!responses.yearsExperience || !filters.yearsExperience.includes(responses.yearsExperience as string)) {
      return false;
    }
  }

  // Leadership challenges filter (OR logic - match any)
  if (filters.leadershipChallenges && filters.leadershipChallenges.length > 0) {
    const userChallenges = (responses.leadershipChallenges as string[]) || [];
    const hasMatch = filters.leadershipChallenges.some((c) => userChallenges.includes(c));
    if (!hasMatch) return false;
  }

  // Leadership priorities filter (OR logic - match any)
  if (filters.leadershipPriorities && filters.leadershipPriorities.length > 0) {
    const userPriorities = (responses.leadershipPriorities as string[]) || [];
    const hasMatch = filters.leadershipPriorities.some((p) => userPriorities.includes(p));
    if (!hasMatch) return false;
  }

  // Interests filter (checks recharge activities, content preferences, fitness)
  if (filters.interests && filters.interests.length > 0) {
    const userInterests = [
      ...((responses.rechargeActivities as string[]) || []),
      ...((responses.contentPreferences as string[]) || []),
      ...((responses.fitnessActivities as string[]) || []),
    ];
    const hasMatch = filters.interests.some((i) => userInterests.includes(i));
    if (!hasMatch) return false;
  }

  // Location filter (partial match)
  if (filters.location && filters.location.trim() !== "") {
    const userLocation = userProfile.location?.toLowerCase() || "";
    if (!userLocation.includes(filters.location.toLowerCase())) {
      return false;
    }
  }

  return true;
}

// Keyword search across profile and responses
function matchesKeywords(
  userProfile: { name: string; position: string; title: string; company?: string },
  responses: Record<string, unknown>,
  keywords: string
): boolean {
  const searchTerms = keywords.toLowerCase().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return true;

  // Build searchable text from profile
  const searchableText = [
    userProfile.name,
    userProfile.position,
    userProfile.title,
    userProfile.company || "",
    responses.industry as string || "",
    responses.leadershipLevel as string || "",
    ...((responses.leadershipPriorities as string[]) || []),
    ...((responses.leadershipChallenges as string[]) || []),
    ...((responses.rechargeActivities as string[]) || []),
    ...((responses.leadershipPhilosophy as string[]) || []),
  ].join(" ").toLowerCase();

  // Check if all search terms are found
  return searchTerms.every((term) => searchableText.includes(term));
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;

    let currentUserId: string | undefined;
    if (session) {
      currentUserId = session.userId;
    } else if (deviceId) {
      currentUserId = deviceId;
    } else {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { filters, keywords, page = 1, pageSize = 20, sortBy = "relevance" } = body as {
      filters?: SearchFilters;
      keywords?: string;
      page?: number;
      pageSize?: number;
      sortBy?: "relevance" | "match" | "name" | "level";
    };

    // Get current user's responses for match calculation
    const currentUserResponses = questionnaireResponses.get(currentUserId);
    const currentResponses = currentUserResponses?.responses || {};

    const results: AttendeeSearchResult[] = [];

    // Search through all users with completed questionnaires
    for (const [, user] of users.entries()) {
      // Skip current user
      if (user.id === currentUserId) continue;
      
      // Skip users without completed questionnaires
      if (!user.questionnaireCompleted) continue;

      const candidateResponses = questionnaireResponses.get(user.id);
      if (!candidateResponses) continue;

      // Apply filters
      if (filters && Object.keys(filters).length > 0) {
        if (!matchesFilters(candidateResponses.responses, { location: user.location }, filters)) {
          continue;
        }
      }

      // Apply keyword search
      if (keywords && keywords.trim() !== "") {
        if (!matchesKeywords(
          { name: user.name, position: user.position, title: user.title, company: user.company },
          candidateResponses.responses,
          keywords
        )) {
          continue;
        }
      }

      // Calculate match data
      const { percentage, commonalities } = calculateMatchData(
        currentResponses,
        candidateResponses.responses
      );

      const publicUser: PublicUser = {
        id: user.id,
        profile: {
          name: user.name,
          position: user.position,
          title: user.title,
          company: user.company,
          photoUrl: user.photoUrl,
          location: user.location,
        },
        questionnaireCompleted: user.questionnaireCompleted,
      };

      results.push({
        user: publicUser,
        matchPercentage: percentage,
        topCommonalities: commonalities,
        questionnaire: {
          industry: candidateResponses.responses.industry as string,
          leadershipLevel: candidateResponses.responses.leadershipLevel as string,
          organizationSize: candidateResponses.responses.organizationSize as string,
          leadershipPriorities: candidateResponses.responses.leadershipPriorities as string[],
          leadershipChallenges: candidateResponses.responses.leadershipChallenges as string[],
        },
      });
    }

    // Add demo attendees if no real users (for demo purposes)
    if (results.length === 0) {
      results.push(...getDemoAttendees(currentResponses, filters, keywords));
    }

    // Sort results
    switch (sortBy) {
      case "match":
        results.sort((a, b) => b.matchPercentage - a.matchPercentage);
        break;
      case "name":
        results.sort((a, b) => a.user.profile.name.localeCompare(b.user.profile.name));
        break;
      case "level":
        const levelOrder = ["c-suite", "senior-executive", "vp", "director", "manager", "emerging", "founder"];
        results.sort((a, b) => {
          const aLevel = a.questionnaire?.leadershipLevel || "";
          const bLevel = b.questionnaire?.leadershipLevel || "";
          return levelOrder.indexOf(aLevel) - levelOrder.indexOf(bLevel);
        });
        break;
      case "relevance":
      default:
        // Sort by match percentage but also factor in commonality count
        results.sort((a, b) => {
          const scoreA = a.matchPercentage + a.topCommonalities.length * 5;
          const scoreB = b.matchPercentage + b.topCommonalities.length * 5;
          return scoreB - scoreA;
        });
    }

    // Paginate
    const startIndex = (page - 1) * pageSize;
    const paginatedResults = results.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      success: true,
      data: {
        results: paginatedResults,
        total: results.length,
        page,
        pageSize,
        hasMore: startIndex + pageSize < results.length,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Generate demo attendees for when no real users exist
function getDemoAttendees(
  currentResponses: Record<string, unknown>,
  filters?: SearchFilters,
  keywords?: string
): AttendeeSearchResult[] {
  const demoUsers = [
    {
      id: "demo-sarah",
      name: "Sarah Chen",
      position: "VP of Engineering",
      title: "Engineering Leader",
      company: "TechCorp",
      location: "San Francisco, CA",
      responses: {
        industry: "technology",
        leadershipLevel: "vp",
        organizationSize: "large",
        yearsExperience: "11-15",
        leadershipPriorities: ["scaling", "innovation", "mentoring"],
        leadershipChallenges: ["talent", "change", "disruption"],
        rechargeActivities: ["hiking", "reading", "travel"],
        leadershipPhilosophy: ["servant", "people-first", "collaborative"],
        communicationStyle: "warm",
      },
    },
    {
      id: "demo-marcus",
      name: "Marcus Johnson",
      position: "Chief People Officer",
      title: "HR Executive",
      company: "GrowthStartup",
      location: "New York, NY",
      responses: {
        industry: "technology",
        leadershipLevel: "c-suite",
        organizationSize: "mid-size",
        yearsExperience: "16-20",
        leadershipPriorities: ["culture", "mentoring", "transformation"],
        leadershipChallenges: ["talent", "communication", "burnout"],
        rechargeActivities: ["fitness", "reading", "volunteering"],
        leadershipPhilosophy: ["people-first", "coach", "authentic"],
        communicationStyle: "warm",
      },
    },
    {
      id: "demo-elena",
      name: "Elena Rodriguez",
      position: "CEO",
      title: "Founder & CEO",
      company: "InnovateCo",
      location: "Austin, TX",
      responses: {
        industry: "technology",
        leadershipLevel: "founder",
        organizationSize: "startup",
        yearsExperience: "6-10",
        leadershipPriorities: ["scaling", "financial", "strategy"],
        leadershipChallenges: ["priorities", "budget", "buy-in"],
        rechargeActivities: ["travel", "outdoors", "creative"],
        leadershipPhilosophy: ["entrepreneurial", "visionary", "decisive"],
        communicationStyle: "direct",
      },
    },
    {
      id: "demo-david",
      name: "David Park",
      position: "VP of Product",
      title: "Product Leader",
      company: "ScaleUp Inc",
      location: "Seattle, WA",
      responses: {
        industry: "technology",
        leadershipLevel: "vp",
        organizationSize: "mid-size",
        yearsExperience: "6-10",
        leadershipPriorities: ["innovation", "strategy", "excellence"],
        leadershipChallenges: ["priorities", "change", "decisions"],
        rechargeActivities: ["gaming", "music", "learning"],
        leadershipPhilosophy: ["data-informed", "results", "collaborative"],
        communicationStyle: "data-driven",
      },
    },
    {
      id: "demo-aisha",
      name: "Aisha Patel",
      position: "CTO",
      title: "Technology Executive",
      company: "FinanceFlow",
      location: "Chicago, IL",
      responses: {
        industry: "finance",
        leadershipLevel: "c-suite",
        organizationSize: "large",
        yearsExperience: "11-15",
        leadershipPriorities: ["transformation", "innovation", "scaling"],
        leadershipChallenges: ["disruption", "change", "pipeline"],
        rechargeActivities: ["reading", "yoga", "travel"],
        leadershipPhilosophy: ["data-informed", "visionary", "coach"],
        communicationStyle: "facts-first",
      },
    },
    {
      id: "demo-james",
      name: "James Wilson",
      position: "Director of Operations",
      title: "Operations Leader",
      company: "LogiTech Solutions",
      location: "Denver, CO",
      responses: {
        industry: "manufacturing",
        leadershipLevel: "director",
        organizationSize: "mid-size",
        yearsExperience: "11-15",
        leadershipPriorities: ["excellence", "culture", "financial"],
        leadershipChallenges: ["budget", "communication", "priorities"],
        rechargeActivities: ["outdoors", "diy", "fitness"],
        leadershipPhilosophy: ["results", "servant", "collaborative"],
        communicationStyle: "direct",
      },
    },
    {
      id: "demo-lisa",
      name: "Lisa Thompson",
      position: "Senior Manager",
      title: "Marketing Leader",
      company: "BrandCo",
      location: "Los Angeles, CA",
      responses: {
        industry: "media",
        leadershipLevel: "manager",
        organizationSize: "small",
        yearsExperience: "3-5",
        leadershipPriorities: ["culture", "mentoring", "innovation"],
        leadershipChallenges: ["buy-in", "politics", "priorities"],
        rechargeActivities: ["creative", "photography", "travel"],
        leadershipPhilosophy: ["authentic", "people-first", "visionary"],
        communicationStyle: "storytelling",
      },
    },
    {
      id: "demo-michael",
      name: "Michael Brown",
      position: "SVP Sales",
      title: "Sales Executive",
      company: "EnterpriseNow",
      location: "Boston, MA",
      responses: {
        industry: "consulting",
        leadershipLevel: "senior-executive",
        organizationSize: "large",
        yearsExperience: "16-20",
        leadershipPriorities: ["financial", "scaling", "expansion"],
        leadershipChallenges: ["talent", "decisions", "disruption"],
        rechargeActivities: ["golf", "reading", "movies"],
        leadershipPhilosophy: ["results", "decisive", "entrepreneurial"],
        communicationStyle: "direct",
      },
    },
  ];

  return demoUsers
    .filter((demo) => {
      // Apply filters to demo users
      if (filters) {
        if (!matchesFilters(demo.responses, { location: demo.location }, filters)) {
          return false;
        }
      }
      if (keywords && keywords.trim() !== "") {
        if (!matchesKeywords(
          { name: demo.name, position: demo.position, title: demo.title, company: demo.company },
          demo.responses,
          keywords
        )) {
          return false;
        }
      }
      return true;
    })
    .map((demo) => {
      const { percentage, commonalities } = calculateMatchData(currentResponses, demo.responses);
      return {
        user: {
          id: demo.id,
          profile: {
            name: demo.name,
            position: demo.position,
            title: demo.title,
            company: demo.company,
            location: demo.location,
          },
          questionnaireCompleted: true,
        },
        matchPercentage: percentage,
        topCommonalities: commonalities,
        questionnaire: {
          industry: demo.responses.industry,
          leadershipLevel: demo.responses.leadershipLevel,
          organizationSize: demo.responses.organizationSize,
          leadershipPriorities: demo.responses.leadershipPriorities,
          leadershipChallenges: demo.responses.leadershipChallenges,
        },
      };
    });
}

// GET endpoint to fetch filter options
export async function GET() {
  // Return available filter options from questionnaire data
  const filterOptions = {
    industries: QUESTIONNAIRE_SECTIONS[0].questions
      .find((q) => q.id === "industry")
      ?.options?.map((o) => ({ value: o.value, label: o.label, icon: o.icon })) || [],
    leadershipLevels: QUESTIONNAIRE_SECTIONS[0].questions
      .find((q) => q.id === "leadershipLevel")
      ?.options?.map((o) => ({ value: o.value, label: o.label, icon: o.icon })) || [],
    organizationSizes: QUESTIONNAIRE_SECTIONS[0].questions
      .find((q) => q.id === "organizationSize")
      ?.options?.map((o) => ({ value: o.value, label: o.label })) || [],
    yearsExperience: QUESTIONNAIRE_SECTIONS[0].questions
      .find((q) => q.id === "yearsExperience")
      ?.options?.map((o) => ({ value: o.value, label: o.label })) || [],
    leadershipChallenges: QUESTIONNAIRE_SECTIONS[1].questions
      .find((q) => q.id === "leadershipChallenges")
      ?.options?.map((o) => ({ value: o.value, label: o.label, icon: o.icon })) || [],
    leadershipPriorities: QUESTIONNAIRE_SECTIONS[1].questions
      .find((q) => q.id === "leadershipPriorities")
      ?.options?.map((o) => ({ value: o.value, label: o.label, icon: o.icon })) || [],
    interests: [
      ...(QUESTIONNAIRE_SECTIONS[2].questions
        .find((q) => q.id === "rechargeActivities")
        ?.options?.map((o) => ({ value: o.value, label: o.label, icon: o.icon, category: "Activities" })) || []),
      ...(QUESTIONNAIRE_SECTIONS[2].questions
        .find((q) => q.id === "contentPreferences")
        ?.options?.map((o) => ({ value: o.value, label: o.label, icon: o.icon, category: "Content" })) || []),
    ],
  };

  return NextResponse.json({
    success: true,
    data: filterOptions,
  });
}

