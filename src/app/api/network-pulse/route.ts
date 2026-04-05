import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  NETWORK_PULSE_POLLS,
  emptyCountsForPoll,
  getAllNetworkPulsePollIds,
  getPollDefinition,
  isValidNetworkPulseVote,
  majorityOptionIdForPoll,
  majorityTagForOption,
  optionIdsForPoll,
  toPercentagesForPoll,
  type NetworkPulsePollDefinition,
} from "@/lib/network-pulse/constants";
import type { NetworkPulsePollPayload } from "@/lib/network-pulse/types";
import {
  memoryGetNetworkPulseState,
  memorySetNetworkPulseVote,
} from "@/lib/stores/network-pulse-votes-store";

function buildPollPayload(
  poll: NetworkPulsePollDefinition,
  userId: string | undefined,
  rows: { poll_id: string; option_id: string; user_id: string }[]
): NetworkPulsePollPayload {
  const counts = emptyCountsForPoll(poll);
  let userVote: string | null = null;

  for (const row of rows) {
    if (row.poll_id !== poll.pollId) continue;
    const o = row.option_id;
    if (o in counts) {
      counts[o] += 1;
    }
    if (userId && row.user_id === userId) {
      userVote = o;
    }
  }

  const ids = optionIdsForPoll(poll);
  const total = ids.reduce((s, id) => s + counts[id], 0);
  const percentages = toPercentagesForPoll(poll, counts);
  const majorityOptionIdVal = majorityOptionIdForPoll(poll, counts);

  return {
    pollId: poll.pollId,
    counts,
    total,
    percentages,
    majorityOptionId: majorityOptionIdVal,
    majorityLabel: majorityTagForOption(poll, majorityOptionIdVal),
    userVote,
  };
}

async function buildAllPayloads(
  userId: string | undefined
): Promise<Record<string, NetworkPulsePollPayload>> {
  const pollIds = getAllNetworkPulsePollIds();
  const out: Record<string, NetworkPulsePollPayload> = {};

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: rows, error } = await supabaseAdmin
      .from("network_pulse_votes")
      .select("poll_id, option_id, user_id")
      .in("poll_id", pollIds);

    if (error) {
      throw new Error(error.message);
    }

    const list = (rows ?? []) as {
      poll_id: string;
      option_id: string;
      user_id: string;
    }[];

    for (const poll of NETWORK_PULSE_POLLS) {
      out[poll.pollId] = buildPollPayload(poll, userId, list);
    }
    return out;
  }

  for (const poll of NETWORK_PULSE_POLLS) {
    const ids = optionIdsForPoll(poll);
    const { counts, userVote } = memoryGetNetworkPulseState(
      poll.pollId,
      ids,
      userId
    );
    const total = ids.reduce((s, id) => s + counts[id], 0);
    const percentages = toPercentagesForPoll(poll, counts);
    const majorityOptionIdVal = majorityOptionIdForPoll(poll, counts);
    out[poll.pollId] = {
      pollId: poll.pollId,
      counts,
      total,
      percentages,
      majorityOptionId: majorityOptionIdVal,
      majorityLabel: majorityTagForOption(poll, majorityOptionIdVal),
      userVote,
    };
  }
  return out;
}

export async function GET() {
  try {
    const session = await getSession();
    const polls = await buildAllPayloads(session?.userId);
    return NextResponse.json({ success: true, data: { polls } });
  } catch (e) {
    console.error("[network-pulse] GET", e);
    return NextResponse.json(
      { success: false, error: "Failed to load polls" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json(
        { success: false, error: "Sign in to vote" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON" },
        { status: 400 }
      );
    }

    const b =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>)
        : {};

    const pollId =
      typeof b.pollId === "string"
        ? b.pollId
        : typeof b.poll_id === "string"
          ? b.poll_id
          : null;

    const optionId =
      typeof b.optionId === "string"
        ? b.optionId
        : typeof b.option_id === "string"
          ? b.option_id
          : null;

    if (!pollId || !getPollDefinition(pollId)) {
      return NextResponse.json(
        { success: false, error: "Invalid poll" },
        { status: 400 }
      );
    }

    if (!optionId || !isValidNetworkPulseVote(pollId, optionId)) {
      return NextResponse.json(
        { success: false, error: "Invalid option" },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin.from("network_pulse_votes").upsert(
        {
          poll_id: pollId,
          user_id: session.userId,
          option_id: optionId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "poll_id,user_id" }
      );

      if (error) {
        console.error("[network-pulse] upsert", error);
        return NextResponse.json(
          { success: false, error: "Failed to save vote" },
          { status: 500 }
        );
      }
    } else {
      memorySetNetworkPulseVote(pollId, session.userId, optionId);
    }

    const polls = await buildAllPayloads(session.userId);
    return NextResponse.json({ success: true, data: { polls } });
  } catch (e) {
    console.error("[network-pulse] POST", e);
    return NextResponse.json(
      { success: false, error: "Failed to vote" },
      { status: 500 }
    );
  }
}
