/**
 * Restrict gallery `<img>` / `next/image` sources to http(s) URLs (no javascript:, data:, etc.).
 */
export function isSafeGalleryImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (process.env.NODE_ENV === "production" && u.protocol !== "https:") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
