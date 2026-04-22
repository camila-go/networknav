import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { generateConversationStartersAI } from "@/lib/ai/generative";
import { normalizeCompany } from "@/lib/company/normalize";

const schema = z.object({
  userName: z.string().min(1),
  matchName: z.string().min(1),
  matchType: z.enum(["high-affinity", "strategic"]),
  commonalities: z.array(z.string()),
  matchPosition: z.string().optional(),
  matchCompany: z.string().optional(),
  matchedUserId: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  _context: { params: { matchId: string } },
) {
  try {
    const session = await getSession();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid context",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const starters = await generateConversationStartersAI({
      ...parsed.data,
      matchCompany: normalizeCompany(parsed.data.matchCompany),
      viewerId: session?.userId,
      matchId: parsed.data.matchedUserId,
    });

    return NextResponse.json({
      success: true,
      data: { starters: starters ?? [] },
    });
  } catch (error) {
    console.error("Starter generation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate starters" },
      { status: 500 },
    );
  }
}
