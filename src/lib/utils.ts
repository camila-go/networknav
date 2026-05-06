import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return formatDate(date);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/** Max length for Teams deep-link `message` (URL size / client limits). */
const TEAMS_CHAT_MESSAGE_MAX_LEN = 3500;

/**
 * Deep link to a 1:1 Teams chat. Optional `composeMessage` is passed as the `message`
 * query param so Teams can pre-fill the compose box; the user still sends manually.
 * (Some Teams clients may ignore `message`; see Microsoft Teams deep-link docs.)
 *
 * Encoding note: the query string is built with `encodeURIComponent` (RFC 3986) rather
 * than `URLSearchParams` (form-urlencoded). The latter encodes spaces as `+`, which
 * Teams renders literally in the compose box (e.g. `Camila,+I+was+impressed+...`).
 */
export function teamsChartUrl(
  email: string,
  options?: { composeMessage?: string }
): string {
  const params: string[] = [`users=${encodeURIComponent(email.trim())}`];
  const draft = options?.composeMessage?.trim();
  if (draft) {
    const capped =
      draft.length > TEAMS_CHAT_MESSAGE_MAX_LEN
        ? `${draft.slice(0, TEAMS_CHAT_MESSAGE_MAX_LEN - 1)}…`
        : draft;
    params.push(`message=${encodeURIComponent(capped)}`);
  }
  return `https://teams.microsoft.com/l/chat/0/0?${params.join("&")}`;
}

export function teamsMeetingUrl(email: string, subject?: string): string {
  // Same RFC 3986 encoding as `teamsChartUrl` so subjects with spaces don't
  // arrive as `Catch+up` in Teams.
  const params: string[] = [`attendees=${encodeURIComponent(email.trim())}`];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  return `https://teams.microsoft.com/l/meeting/new?${params.join("&")}`;
}

