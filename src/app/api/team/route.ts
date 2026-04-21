import { NextResponse } from "next/server";
import { lookupUserProfileByIdentifier } from "@/lib/profile/lookup-user-profile";

export type TeamMemberPayload = {
  id: string;
  name: string;
  title: string;
  photoUrl: string | null;
  email: string | null;
  /** True when no Supabase row exists (placeholder bios only). */
  placeholder?: boolean;
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
    lookupKeys: ["APOTTER16", "Austin Potter", "austin.potter"],
  },
  {
    name: "Lisa Lucas",
    title: "Senior Designer",
    placeholderId: "team-lisa-lucas",
    lookupKeys: [],
  },
];

/**
 * Public team roster for About Jynx: resolves Supabase users when possible.
 */
export async function GET() {
  const members: TeamMemberPayload[] = [];

  for (const def of TEAM_DEFINITIONS) {
    const envId = def.envUserIdKey
      ? process.env[def.envUserIdKey]?.trim()
      : undefined;

    let row = envId ? await lookupUserProfileByIdentifier(envId) : null;
    if (!row) {
      for (const key of def.lookupKeys) {
        row = await lookupUserProfileByIdentifier(key);
        if (row) break;
      }
    }

    if (row) {
      members.push({
        id: row.id,
        name: row.name?.trim() || def.name,
        title: row.title?.trim() || def.title,
        photoUrl: row.photo_url?.trim() || null,
        email: row.email?.trim() || null,
      });
      continue;
    }

    if (def.placeholderId) {
      members.push({
        id: def.placeholderId,
        name: def.name,
        title: def.title,
        photoUrl: null,
        email: null,
        placeholder: true,
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
    });
  }

  return NextResponse.json({ success: true, data: { members } });
}
