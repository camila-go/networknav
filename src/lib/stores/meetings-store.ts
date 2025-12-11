/**
 * In-memory meetings store (replace with database in production)
 */

import type { Meeting, SavedSearch } from "@/types";

export const meetings = new Map<string, Meeting>();
export const savedSearches = new Map<string, SavedSearch[]>();

