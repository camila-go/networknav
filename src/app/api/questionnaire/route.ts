import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { questionnaireResponseSchema } from "@/lib/validations";
import { users, questionnaireResponses } from "@/lib/stores";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { responses } = body;

    // Validate responses
    const result = questionnaireResponseSchema.safeParse(responses);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid questionnaire data",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Calculate completion percentage
    const requiredFields = [
      "industry",
      "yearsExperience",
      "leadershipLevel",
      "organizationSize",
      "leadershipPriorities",
      "leadershipChallenges",
      "growthAreas",
      "networkingGoals",
      "rechargeActivities",
      "contentPreferences",
      "idealWeekend",
      "energizers",
      "leadershipPhilosophy",
      "decisionMakingStyle",
      "failureApproach",
      "relationshipValues",
      "communicationStyle",
    ];

    const answeredRequired = requiredFields.filter((field) => {
      const value = result.data[field as keyof typeof result.data];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== "";
    });

    const completionPercentage = Math.round(
      (answeredRequired.length / requiredFields.length) * 100
    );

    // Store questionnaire response
    const now = new Date();
    questionnaireResponses.set(session.userId, {
      userId: session.userId,
      responses: result.data,
      completionPercentage,
      completedAt: completionPercentage >= 100 ? now : undefined,
      lastUpdated: now,
    });

    // Update user's questionnaire status
    const user = users.get(session.email);
    if (user && completionPercentage >= 80) {
      user.questionnaireCompleted = true;
      user.updatedAt = now;
    }

    return NextResponse.json({
      success: true,
      data: {
        completionPercentage,
        message:
          completionPercentage >= 100
            ? "Questionnaire completed successfully!"
            : "Progress saved successfully",
      },
    });
  } catch (error) {
    console.error("Questionnaire save error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const response = questionnaireResponses.get(session.userId);

    if (!response) {
      return NextResponse.json({
        success: true,
        data: {
          responses: {},
          completionPercentage: 0,
          completedAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        responses: response.responses,
        completionPercentage: response.completionPercentage,
        completedAt: response.completedAt,
      },
    });
  } catch (error) {
    console.error("Questionnaire fetch error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}


