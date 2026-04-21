/**
 * Pixel distance between horizontal snap positions (slide width + flex gap).
 * Uses the first slide’s laid-out width so it stays correct when slides use max-w + vw.
 */
export function getHorizontalCarouselStride(
  scrollEl: HTMLDivElement,
  slideSelector = "[data-carousel-slide]"
): number {
  const slide = scrollEl.querySelector<HTMLElement>(slideSelector);
  if (!slide) return Math.max(scrollEl.clientWidth * 0.85 + 16, 1);
  const gap = parseInt(getComputedStyle(scrollEl).gap || "16", 10) || 16;
  const w = slide.getBoundingClientRect().width;
  return Math.max(w + gap, 1);
}
