import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { questionnaireResponses, users } from "@/lib/stores";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { profileAnswerRowsFromQuestionnaire } from "@/lib/profile/questionnaire-answers-display";
import { lookupUserProfileByIdentifier } from "@/lib/profile/lookup-user-profile";

interface UserInterests {
  archetype: string | null;
  teamQualities: string[];
  personalityTags: string[];
  talkTopic: string | null;
  headline: string | null;
  personalInterest: string | null;
}

function emptyInterests(): UserInterests {
  return {
    archetype: null,
    teamQualities: [],
    personalityTags: [],
    talkTopic: null,
    headline: null,
    personalInterest: null,
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
  const str = (key: string): string | null => {
    const v = data[key];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  return {
    archetype: str("archetype"),
    teamQualities: strings("teamQualities"),
    personalityTags: strings("personalityTags"),
    talkTopic: str("talkTopic"),
    headline: str("headline"),
    personalInterest: str("personalInterest"),
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
    let questionnaireRaw: Record<string, unknown> | null = null;

    if (isSupabaseConfigured && supabaseAdmin) {
      let byProfileId: {
        name: string | null;
        questionnaire_data: unknown;
        questionnaire_completed: boolean | null;
      } | null = null;

      const resolved = await lookupUserProfileByIdentifier(targetUserId);
      if (resolved) {
        const result = await supabaseAdmin
          .from("user_profiles")
          .select("name, questionnaire_data, questionnaire_completed")
          .eq("id", resolved.id)
          .maybeSingle();
        if (result.data) {
          const r = result.data;
          byProfileId = {
            name: r.name ?? null,
            questionnaire_data: r.questionnaire_data ?? null,
            questionnaire_completed: r.questionnaire_completed ?? null,
          };
        }
      }

      if (!byProfileId) {
        const { data: byAuthId } = await supabaseAdmin
          .from("user_profiles")
          .select("name, questionnaire_data, questionnaire_completed")
          .eq("user_id", targetUserId)
          .maybeSingle();
        if (byAuthId) {
          byProfileId = {
            name: byAuthId.name ?? null,
            questionnaire_data: byAuthId.questionnaire_data ?? null,
            questionnaire_completed: byAuthId.questionnaire_completed ?? null,
          };
        }
      }

      if (byProfileId) {
        userName = (byProfileId.name as string)?.trim() || "User";
        questionnaireCompleted = !!byProfileId.questionnaire_completed;
        questionnaireRaw =
          (byProfileId.questionnaire_data as Record<string, unknown>) || null;
        interests = interestsFromQuestionnaireData(questionnaireRaw);
      }
    }

    const hasAnyChip =
      !!interests.archetype ||
      interests.teamQualities.length > 0 ||
      interests.personalityTags.length > 0 ||
      !!interests.talkTopic ||
      !!interests.headline ||
      !!interests.personalInterest;

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
        profileAnswers: profileAnswerRowsFromQuestionnaire(questionnaireRaw),
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
