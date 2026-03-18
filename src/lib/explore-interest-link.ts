/** Explore Search tab — scoped to interests so results are people who selected that topic */
export function exploreInterestSearchHref(label: string): string {
  const q = label.trim();
  if (!q) return "/explore?tab=search";
  return `/explore?tab=search&q=${encodeURIComponent(q)}&scope=interests`;
}
