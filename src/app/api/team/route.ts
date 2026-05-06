import { NextResponse } from "next/server";
import { lookupUserProfileByIdentifier } from "@/lib/profile/lookup-user-profile";

// Vercel statically prerenders `GET()` route handlers with no `request` arg by
// default, which froze a stale Camila avatar URL in the response. Force dynamic
// rendering so each call reflects the current DB state.
export const dynamic = "force-dynamic";
export const revalidate = 0;
import {
  LISA_LUCAS_AVATAR_PUBLIC_URL,
  LISA_LUCAS_PLACEHOLDER_ROUTE_ID,
  LISA_LUCAS_USER_PROFILE_ID,
} from "@/lib/team/lisa-lucas";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/auth/rbac";

/** Records which lookup branch resolved a team member; debug-only. */
type ResolutionDebug = {
  matchedBy: "envId" | "lisaFallback" | "lookupKey" | "placeholder";
  /** The actual identifier that matched (env var name, lookup key, or placeholder id). */
  source: string;
};

export type TeamMemberPayload = {
  id: string;
  name: string;
  title: string;
  photoUrl: string | null;
  email: string | null;
  /** True when no Supabase row exists (placeholder bios only). */
  placeholder?: boolean;
  /** Debug-only: present when caller is admin or NODE_ENV !== "production". */
  _resolution?: ResolutionDebug;
};

const TEAM_DEFINITIONS: Array<{
  name: string;
  title: string;
  /** Try env UUID first, then each lookup string. */
  envUserIdKey?: string;
  lookupKeys: string[];
  placeholderId?: string;
}> = [
  {
    name: "Camila Gonzalez",
    title: "UI/UX Designer",
    envUserIdKey: "NEXT_PUBLIC_TEAM_CAMILA_USER_ID",
    lookupKeys: ["Camila.Gonzalez", "Camila Gonzalez"],
  },
  {
    name: "Austin Potter",
    title: "Artificial Intelligence Innovation Developer",
    envUserIdKey: "NEXT_PUBLIC_TEAM_AUSTIN_USER_ID",
    // Multiple variants so the helper can resolve via name (exact + substring),
    // email local-part, or username regardless of how the row was stored.
    lookupKeys: [
      "APOTTER16",
      "apotter16",
      "apotter",
      "Austin Potter",
      "Austin J. Potter",
      "austin.potter",
      "austin.j.potter",
      "austinpotter",
    ],
  },
  {
    name: "Lisa Lucas",
    title: "Senior Designer",
    envUserIdKey: "NEXT_PUBLIC_TEAM_LISA_USER_ID",
    lookupKeys: [
      "Lisa Lucas",
      "Lisa.Lucas",
      "lisa.lucas",
      "lisa lucas",
    ],
    /** Fallback when no matching `user_profiles` row (About copy + profile stub). */
    placeholderId: "team-lisa-lucas",
  },
];

/**
 * Public team roster for About Jynx: resolves Supabase users when possible.
 *
 * In non-production, or for admin sessions, each member is annotated with
 * `_resolution` describing which lookup branch matched. This makes "why is
 * member X showing as a placeholder?" a one-request diagnostic instead of a
 * code spelunk.
 */
export async function GET() {
  const members: TeamMemberPayload[] = [];

  for (const def of TEAM_DEFINITIONS) {
    const envId = def.envUserIdKey
      ? process.env[def.envUserIdKey]?.trim()
      : undefined;

    let resolution: ResolutionDebug | null = null;
    let row = envId ? await lookupUserProfileByIdentifier(envId) : null;
    if (row) resolution = { matchedBy: "envId", source: def.envUserIdKey ?? "" };

    if (
      !row &&
      def.placeholderId === LISA_LUCAS_PLACEHOLDER_ROUTE_ID
    ) {
      row = await lookupUserProfileByIdentifier(LISA_LUCAS_USER_PROFILE_ID);
      if (row) {
        resolution = {
          matchedBy: "lisaFallback",
          source: LISA_LUCAS_USER_PROFILE_ID,
        };
      }
    }
    if (!row) {
      for (const key of def.lookupKeys) {
        row = await lookupUserProfileByIdentifier(key);
        if (row) {
          resolution = { matchedBy: "lookupKey", source: key };
          break;
        }
      }
    }

    if (row) {
      members.push({
        id: row.id,
        name: row.name?.trim() || def.name,
        title: row.title?.trim() || def.title,
        photoUrl: row.photo_url?.trim() || null,
        email: row.email?.trim() || null,
        ...(resolution ? { _resolution: resolution } : {}),
      });
      continue;
    }

    if (def.placeholderId) {
      members.push({
        id: def.placeholderId,
        name: def.name,
        title: def.title,
        photoUrl:
          def.placeholderId === LISA_LUCAS_PLACEHOLDER_ROUTE_ID
            ? LISA_LUCAS_AVATAR_PUBLIC_URL
            : null,
        email: null,
        placeholder: true,
        _resolution: { matchedBy: "placeholder", source: def.placeholderId },
      });
      continue;
    }

    members.push({
      id: def.lookupKeys[0] ?? def.name.replace(/\s+/g, "."),
      name: def.name,
      title: def.title,
      photoUrl: null,
      email: null,
      placeholder: true,
      _resolution: { matchedBy: "placeholder", source: def.lookupKeys[0] ?? def.name },
    });
  }

  // Strip debug payload unless in dev OR caller is admin. We always compute it so
  // the same code path runs in both modes (avoids prod-only bugs).
  let revealDebug = process.env.NODE_ENV !== "production";
  if (!revealDebug) {
    try {
      const session = await getSession();
      if (session && isAdmin(session)) revealDebug = true;
    } catch {
      // Session lookup failures should not block the public team list.
    }
  }
  const payload = revealDebug
    ? members
    : members.map(({ _resolution: _ignored, ...rest }) => rest);

  return NextResponse.json({ success: true, data: { members: payload } });
}
