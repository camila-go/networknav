import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { questionnaireResponses, users } from "@/lib/stores";
import { cookies } from "next/headers";

interface UserInterests {
  rechargeActivities: string[];
  fitnessActivities: string[];
  volunteerCauses: string[];
  contentPreferences: string[];
  customInterests: string[];
  idealWeekend: string | null;
  leadershipPriorities: string[];
  networkingGoals: string[];
}

// Demo interests for users without questionnaire data
const DEMO_INTERESTS_POOL = {
  rechargeActivities: [
    "Reading", "Meditation", "Hiking", "Travel", "Cooking", "Photography",
    "Music", "Podcasts", "Gardening", "Art", "Writing", "Gaming"
  ],
  fitnessActivities: [
    "Running", "Yoga", "Weightlifting", "Swimming", "Cycling", "Tennis",
    "Golf", "CrossFit", "Pilates", "Hiking", "Basketball", "Soccer"
  ],
  volunteerCauses: [
    "Education", "Environment", "Healthcare", "Youth mentorship", "Animal welfare",
    "Homelessness", "Arts & culture", "Technology access", "Food security"
  ],
  contentPreferences: [
    "Business podcasts", "Tech blogs", "Leadership books", "Industry news",
    "TED Talks", "Online courses", "Newsletters", "Research papers"
  ],
  leadershipPriorities: [
    "Team development", "Innovation", "Culture building", "Strategic growth",
    "Operational excellence", "Customer focus", "Digital transformation"
  ],
  networkingGoals: [
    "Find mentors", "Learn from peers", "Explore partnerships", "Career growth",
    "Industry insights", "Build community", "Share knowledge"
  ],
  idealWeekends: [
    "Exploring new hiking trails and enjoying nature",
    "Quality time with family and catching up on reading",
    "Working on side projects and learning new skills",
    "Traveling to new places and experiencing different cultures",
    "Hosting friends for dinner and good conversations",
    "Attending local events and discovering new restaurants"
  ]
};

function generateDemoInterests(userId: string): UserInterests {
  // Use userId to create deterministic but varied interests
  const seed = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  
  const pickRandom = (arr: string[], count: number, offset: number = 0): string[] => {
    const shuffled = [...arr].sort((a, b) => {
      const aHash = (a.charCodeAt(0) + seed + offset) % 100;
      const bHash = (b.charCodeAt(0) + seed + offset) % 100;
      return aHash - bHash;
    });
    return shuffled.slice(0, count);
  };

  return {
    rechargeActivities: pickRandom(DEMO_INTERESTS_POOL.rechargeActivities, 3 + (seed % 3), 1),
    fitnessActivities: pickRandom(DEMO_INTERESTS_POOL.fitnessActivities, 2 + (seed % 2), 2),
    volunteerCauses: pickRandom(DEMO_INTERESTS_POOL.volunteerCauses, 2 + (seed % 2), 3),
    contentPreferences: pickRandom(DEMO_INTERESTS_POOL.contentPreferences, 2 + (seed % 3), 4),
    customInterests: [],
    idealWeekend: DEMO_INTERESTS_POOL.idealWeekends[seed % DEMO_INTERESTS_POOL.idealWeekends.length],
    leadershipPriorities: pickRandom(DEMO_INTERESTS_POOL.leadershipPriorities, 2 + (seed % 2), 5),
    networkingGoals: pickRandom(DEMO_INTERESTS_POOL.networkingGoals, 2 + (seed % 2), 6),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;
    
    // Allow authenticated users and demo users
    if (!session && !deviceId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const targetUserId = params.userId;
    let interests: UserInterests | null = null;

    // Try to get questionnaire responses for the target user
    const questionnaire = questionnaireResponses.get(targetUserId);
    
    if (questionnaire && questionnaire.responses) {
      const r = questionnaire.responses;
      interests = {
        rechargeActivities: r.rechargeActivities || [],
        fitnessActivities: r.fitnessActivities || [],
        volunteerCauses: r.volunteerCauses || [],
        contentPreferences: r.contentPreferences || [],
        customInterests: r.customInterests || [],
        idealWeekend: r.idealWeekend || null,
        leadershipPriorities: r.leadershipPriorities || [],
        networkingGoals: r.networkingGoals || [],
      };
    }

    // If no questionnaire data, generate demo interests
    if (!interests || (
      interests.rechargeActivities.length === 0 &&
      interests.fitnessActivities.length === 0 &&
      interests.volunteerCauses.length === 0
    )) {
      interests = generateDemoInterests(targetUserId);
    }

    // Get user name
    let userName = "User";
    for (const user of users.values()) {
      if (user.id === targetUserId) {
        userName = user.name;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        userName,
        interests,
      },
    });
  } catch (error) {
    console.error("Get user interests error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
