import { supabaseAdmin } from "@/lib/supabase/client";
import {
  calculateMatchScore,
  determineMatchType,
  generateConversationStarters,
  hasUsableQuestionnaire,
} from "@/lib/matching/market-basket-analysis";
import type { Match, QuestionnaireData } from "@/types";

/**
 * Generates matches from Supabase when the in-memory store is empty.
 * Simplified MBA scoring (no AI conversation starters).
 */
export async function ensureMatchesLoaded(
  currentUserId: string,
  currentUserEmail?: string
): Promise<Match[]> {
  if (!supabaseAdmin) return [];

  let supabaseId: string | null = null;
  if (currentUserId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    const { data } = await supabaseAdmin.from("user_profiles").select("id").eq("id", currentUserId).single();
    if (data) supabaseId = (data as { id: string }).id;
  }
  if (!supabaseId && currentUserEmail && !currentUserEmail.includes("@jynx.demo")) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("email", currentUserEmail.toLowerCase())
      .single();
    if (data) supabaseId = (data as { id: string }).id;
  }

  let currentUserQ: Partial<QuestionnaireData> | null = null;
  if (supabaseId) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("questionnaire_data")
      .eq("id", supabaseId)
      .single();
    if (data) {
      currentUserQ =
        ((data as { questionnaire_data?: Record<string, unknown> }).questionnaire_data as Partial<QuestionnaireData>) ??
        null;
    }
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id, name, email, title, company, photo_url, questionnaire_data")
    .eq("is_active", true)
    .limit(80);

  if (error || !profiles?.length) return [];

  type Profile = {
    id: string;
    name: string;
    email?: string;
    title?: string;
    company?: string;
    photo_url?: string;
    questionnaire_data?: Record<string, unknown>;
  };
  const typed = profiles as unknown as Profile[];
  const filtered = typed.filter((p) => {
    if (supabaseId && p.id === supabaseId) return false;
    if (p.id === currentUserId) return false;
    if (currentUserEmail && p.email?.toLowerCase() === currentUserEmail.toLowerCase()) return false;
    if (!p.name?.trim()) return false;
    return true;
  });

  if (!filtered.length) return [];

  const now = new Date();
  return filtered.map((p) => {
    const candidateQ = (p.questionnaire_data ?? {}) as Partial<QuestionnaireData>;
    let score: number;
    let type: "high-affinity" | "strategic";
    let commonalities: Match["commonalities"];

    if (hasUsableQuestionnaire(currentUserQ) && hasUsableQuestionnaire(p.questionnaire_data)) {
      const ms = calculateMatchScore(currentUserQ as Partial<QuestionnaireData>, candidateQ);
      type = determineMatchType(ms);
      score = Math.min(0.95, ms.totalScore);
      commonalities = ms.commonalities;
    } else {
      score = hasUsableQuestionnaire(p.questionnaire_data) ? 0.65 : 0.5;
      type = "strategic";
      commonalities = [];
    }

    if (commonalities.length === 0) {
      commonalities = [
        {
          category: "professional" as const,
          description: p.title
            ? `${p.title} at ${p.company || "their organization"}`
            : "Fellow conference attendee",
          weight: 0.6,
        },
      ];
    }

    return {
      id: `supabase-match-${p.id}`,
      userId: currentUserId,
      matchedUserId: p.id,
      matchedUser: {
        id: p.id,
        email: p.email,
        profile: {
          name: p.name || "Anonymous",
          title: p.title || "",
          company: p.company,
          photoUrl: p.photo_url,
        },
        questionnaireCompleted: !!p.questionnaire_data,
      },
      type,
      commonalities,
      conversationStarters: generateConversationStarters(commonalities, type, p.name?.split(" ")[0]),
      score,
      generatedAt: now,
      viewed: false,
      passed: false,
    };
  });
}
