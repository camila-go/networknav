/**
 * In-memory connections store (replace with database in production)
 */

import type { Connection, Message, Match } from "@/types";

export const connections = new Map<string, Connection>();
export const messages = new Map<string, Message[]>();
export const userMatches = new Map<string, Match[]>();

