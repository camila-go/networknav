/**
 * Normalize activity labels for storage and aggregation (lowercase, slug-safe).
 */
export function normalizeActivityTag(raw: string | undefined | null): string | null {
  if (raw == null) return null;
  const t = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  return t.length > 0 ? t : null;
}

/**
 * Rough default chip from free-text personal interest (first clause before comma).
 */
export function suggestActivityTagFromPersonalInterest(text: string | undefined): string {
  if (!text?.trim()) return "";
  const first = text.split(",")[0]?.trim() ?? text.trim();
  return first.slice(0, 40);
}
