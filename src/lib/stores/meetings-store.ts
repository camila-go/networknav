/**
 * In-memory meetings store (replace with database in production)
 *
 * Uses globalThis so the Maps are shared across Next.js route compilations.
 */

import type { Meeting, SavedSearch } from "@/types";

const g = globalThis as unknown as {
  __netnav_meetings?: Map<string, Meeting>;
  __netnav_savedSearches?: Map<string, SavedSearch[]>;
};

export const meetings = (g.__netnav_meetings ??= new Map<string, Meeting>());
export const savedSearches = (g.__netnav_savedSearches ??= new Map<string, SavedSearch[]>());
