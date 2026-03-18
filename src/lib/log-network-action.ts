/**
 * Client-side gamification hooks for Meet / Chat / Pass (Teams CTAs).
 * Fails silently when unauthenticated or offline.
 */

export type NetworkActionSource =
  | "explore_search"
  | "explore_feed"
  | "dashboard_match"
  | "user_profile";

async function postActivity(
  activityType: "message_sent" | "meeting_scheduled" | "explore_pass",
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await fetch("/api/activity", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activityType, metadata }),
    });
  } catch {
    /* ignore */
  }
}

export function logTeamsChatClick(metadata: {
  source: NetworkActionSource;
  targetUserId: string;
  targetEmail?: string;
}): void {
  void postActivity("message_sent", {
    ...metadata,
    trigger: "teams_chat_click",
  });
}

export function logTeamsMeetClick(metadata: {
  source: NetworkActionSource;
  targetUserId: string;
  targetEmail?: string;
}): void {
  void postActivity("meeting_scheduled", {
    ...metadata,
    trigger: "teams_meet_click",
  });
}

export function logExplorePassClick(metadata: {
  source: NetworkActionSource;
  targetUserId: string;
}): void {
  void postActivity("explore_pass", {
    ...metadata,
    trigger: "explore_pass_click",
  });
}
