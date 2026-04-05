/** Saturated accents that read on dark UI with white chip text. Order fixed for stable hashing. */
const TAG_PALETTE = [
  "#059669",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#0d9488",
  "#4f46e5",
  "#ca8a04",
  "#16a34a",
  "#dc2626",
  "#0891b2",
  "#9333ea",
  "#c026d3",
  "#65a30d",
  "#e11d48",
  "#0284c7",
] as const;

function tagStringHash(s: string): number {
  let h = 0;
  const t = s.trim().toLowerCase();
  for (let i = 0; i < t.length; i++) {
    h = (Math.imul(31, h) + t.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic background for a gallery activity tag (chip). */
export function galleryTagBackground(tag: string): string {
  const i = tagStringHash(tag) % TAG_PALETTE.length;
  return TAG_PALETTE[i];
}
