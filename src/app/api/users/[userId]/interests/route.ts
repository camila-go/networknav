import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { questionnaireResponses, users } from "@/lib/stores";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

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

function emptyInterests(): UserInterests {
  return {
    rechargeActivities: [],
    fitnessActivities: [],
    volunteerCauses: [],
    contentPreferences: [],
    customInterests: [],
    idealWeekend: null,
    leadershipPriorities: [],
    networkingGoals: [],
  };
}

/** Map stored questionnaire JSON to profile interest chips (questionnaire answers only). */
function interestsFromQuestionnaireData(
  data: Record<string, unknown> | null | undefined
): UserInterests {
  if (!data || typeof data !== "object") {
    return emptyInterests();
  }
  const strings = (key: string): string[] => {
    const v = data[key];
    if (!Array.isArray(v)) return [];
    return v
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
  };
  const ideal =
    typeof data.idealWeekend === "string" && data.idealWeekend.trim()
      ? data.idealWeekend.trim()
      : null;

  return {
    rechargeActivities: strings("rechargeActivities"),
    fitnessActivities: strings("fitnessActivities"),
    volunteerCauses: strings("volunteerCauses"),
    contentPreferences: strings("contentPreferences"),
    customInterests: strings("customInterests"),
    idealWeekend: ideal,
    leadershipPriorities: strings("leadershipPriorities"),
    networkingGoals: strings("networkingGoals"),
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

    if (!session && !deviceId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const targetUserId = params.userId;
    let interests: UserInterests = emptyInterests();
    let userName = "User";
    let questionnaireCompleted = false;

    if (isSupabaseConfigured && supabaseAdmin) {
      const { data: byProfileId, error: e1 } = await supabaseAdmin
        .from("user_profiles")
        .select("name, questionnaire_data, questionnaire_completed")
        .eq("id", targetUserId)
        .maybeSingle();

      if (!e1 && byProfileId) {
        userName = (byProfileId.name as string)?.trim() || "User";
        questionnaireCompleted = !!byProfileId.questionnaire_completed;
        interests = interestsFromQuestionnaireData(
          (byProfileId.questionnaire_data as Record<string, unknown>) || null
        );
      } else {
        const { data: byAuthId, error: e2 } = await supabaseAdmin
          .from("user_profiles")
          .select("name, questionnaire_data, questionnaire_completed")
          .eq("user_id", targetUserId)
          .maybeSingle();

        if (!e2 && byAuthId) {
          userName = (byAuthId.name as string)?.trim() || "User";
          questionnaireCompleted = !!byAuthId.questionnaire_completed;
          interests = interestsFromQuestionnaireData(
            (byAuthId.questionnaire_data as Record<string, unknown>) || null
          );
        }
      }
    }

    const hasAnyChip =
      interests.rechargeActivities.length > 0 ||
      interests.fitnessActivities.length > 0 ||
      interests.volunteerCauses.length > 0 ||
      interests.contentPreferences.length > 0 ||
      interests.customInterests.length > 0 ||
      interests.leadershipPriorities.length > 0 ||
      interests.networkingGoals.length > 0 ||
      interests.idealWeekend;

    if (!hasAnyChip) {
      const questionnaire = questionnaireResponses.get(targetUserId);
      if (questionnaire?.responses) {
        interests = interestsFromQuestionnaireData(
          questionnaire.responses as Record<string, unknown>
        );
      }
      for (const user of users.values()) {
        if (user.id === targetUserId) {
          userName = user.name;
          if (!isSupabaseConfigured || !questionnaireCompleted) {
            questionnaireCompleted = user.questionnaireCompleted;
          }
          break;
        }
      }
    } else {
      for (const user of users.values()) {
        if (user.id === targetUserId) {
          userName = user.name;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        userName,
        interests,
        questionnaireCompleted,
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
