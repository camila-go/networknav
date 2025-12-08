import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { questionnaireResponseSchema } from "@/lib/validations";
import { users, questionnaireResponses } from "@/lib/stores";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // For demo: allow anonymous submissions with a device ID
    const deviceId = request.cookies.get("device_id")?.value || crypto.randomUUID();
    const userId = session?.userId || `demo_${deviceId}`;
    const userEmail = session?.email || `demo_${deviceId}@jynx.demo`;

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
    questionnaireResponses.set(userId, {
      userId: userId,
      responses: result.data,
      completionPercentage,
      completedAt: completionPercentage >= 100 ? now : undefined,
      lastUpdated: now,
    });

    // Update user's questionnaire status if authenticated
    if (session) {
      const user = users.get(session.email);
      if (user && completionPercentage >= 80) {
        user.questionnaireCompleted = true;
        user.updatedAt = now;
      }
    }

    // Set device ID cookie for demo users
    const response = NextResponse.json({
      success: true,
      data: {
        completionPercentage,
        message:
          completionPercentage >= 100
            ? "Questionnaire completed successfully!"
            : "Progress saved successfully",
      },
    });

    // Set device ID cookie if not authenticated
    if (!session) {
      response.cookies.set("device_id", deviceId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error("Questionnaire save error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const deviceId = request.cookies.get("device_id")?.value;
    const userId = session?.userId || (deviceId ? `demo_${deviceId}` : null);

    if (!userId) {
      return NextResponse.json({
        success: true,
        data: {
          responses: {},
          completionPercentage: 0,
          completedAt: null,
        },
      });
    }

    const storedResponse = questionnaireResponses.get(userId);

    if (!storedResponse) {
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
        responses: storedResponse.responses,
        completionPercentage: storedResponse.completionPercentage,
        completedAt: storedResponse.completedAt,
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


