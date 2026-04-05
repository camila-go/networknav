import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { userMatches } from "@/lib/stores";
import { isLiveDatabaseMode } from "@/lib/supabase/data-mode";
import { supabaseAdmin } from "@/lib/supabase/client";
import { ensureMatchesLoaded } from "@/lib/network/ensure-matches-loaded";
import { fetchProfileBasics } from "@/lib/network/fetch-profile-basics";
import { buildNetworkAssistantContext } from "@/lib/network/build-assistant-context";
import { generateJynxNetworkReply, type NetworkAssistantTurn } from "@/lib/ai/generative";
import { checkRateLimit } from "@/lib/security/rateLimit";

const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 4000;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { allowed } = await checkRateLimit(session.userId, "jynx-network-assistant");
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Try again in a little while." },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const raw = (body as { messages?: unknown }).messages;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json({ success: false, error: "messages array required" }, { status: 400 });
    }

    const messages: NetworkAssistantTurn[] = [];
    for (const m of raw.slice(-MAX_MESSAGES)) {
      if (!m || typeof m !== "object") continue;
      const role = (m as { role?: string }).role;
      const content = (m as { content?: string }).content;
      if (role !== "user" && role !== "assistant") continue;
      if (typeof content !== "string") continue;
      const c = content.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!c) continue;
      messages.push({ role, content: c });
    }

    if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
      return NextResponse.json(
        { success: false, error: "Include at least one user message as the latest turn." },
        { status: 400 }
      );
    }

    if (!userMatches.get(session.userId)?.length && isLiveDatabaseMode() && supabaseAdmin) {
      try {
        const loaded = await ensureMatchesLoaded(session.userId, session.email);
        if (loaded.length > 0) {
          userMatches.set(session.userId, loaded);
        }
      } catch (e) {
        console.error("network-assistant: ensureMatchesLoaded", e);
      }
    }

    const matches = userMatches.get(session.userId) ?? [];
    const profile = await fetchProfileBasics(session.userId);
    const selfName = profile?.name ?? "Summit attendee";
    const contextBlock = buildNetworkAssistantContext(selfName, matches);

    const reply = await generateJynxNetworkReply(contextBlock, messages);

    if (!reply) {
      const fallback =
        "I can’t reach the AI service from here. You can still open Matches to review suggestions, use Search to find people by topic, and prioritize a mix of high-affinity and strategic introductions over the first two days.";
      return NextResponse.json({
        success: true,
        data: { message: fallback, fallback: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: reply, fallback: false },
    });
  } catch (error) {
    console.error("network-assistant error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
