import { NextRequest, NextResponse } from "next/server";
import { generateQuestionReaction } from "@/lib/ai/generative";
import { getCannedReaction } from "@/lib/questionnaire-reactions";
import { checkRateLimit } from "@/lib/security/rateLimit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP or device_id
    const identifier =
      request.cookies.get("device_id")?.value ||
      request.headers.get("x-forwarded-for") ||
      "anonymous";

    const rateCheck = await checkRateLimit(identifier, "questionnaire-save");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { questionId, questionText, answer, context } = body as {
      questionId: string;
      questionText: string;
      answer: string;
      context?: { question: string; answer: string }[];
    };

    if (!questionId || !answer) {
      return NextResponse.json(
        { success: false, error: "Missing questionId or answer" },
        { status: 400 }
      );
    }

    // Try AI-generated reaction first
    const aiReaction = await generateQuestionReaction(
      questionText || questionId,
      answer,
      context || []
    );

    if (aiReaction) {
      return NextResponse.json({
        success: true,
        data: { reaction: aiReaction, source: "ai" },
      });
    }

    // Fall back to canned reaction
    const cannedReaction = getCannedReaction(questionId, answer);
    return NextResponse.json({
      success: true,
      data: { reaction: cannedReaction, source: "canned" },
    });
  } catch (error) {
    console.error("Questionnaire reaction error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate reaction" },
      { status: 500 }
    );
  }
}
