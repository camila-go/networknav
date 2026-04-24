"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CommunityGalleryTheme } from "@/types/gallery";
import { isSafeGalleryImageUrl } from "@/lib/gallery/safe-image-url";
import { galleryTagBackground } from "@/lib/gallery/tag-accent";

/** Search page (`/explore`) reads `q` into the attendee keyword field. */
function exploreHrefForTag(activityTag: string): string {
  const q = activityTag.trim();
  return `/explore?q=${encodeURIComponent(q)}`;
}

type Payload = {
  denominator: number;
  methodology: string;
  themes: CommunityGalleryTheme[];
  /** All labeled profile photos included in this gallery (across interests). */
  totalLabeledPhotos?: number;
};

type GalleryPhoto = { url: string; userId: string };

/** ~3.8s on one image + 0.9s crossfade before the next (no overlap between cycles) */
const CROSSFADE_MS = 900;
const SLIDE_CYCLE_MS = 3800 + CROSSFADE_MS;
const THEME_FLOW_EASE = "transition-[transform,opacity,filter] duration-500 ease-out";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function dedupePhotos(photos: GalleryPhoto[]): GalleryPhoto[] {
  const seen = new Set<string>();
  const out: GalleryPhoto[] = [];
  for (const p of photos) {
    if (!isSafeGalleryImageUrl(p.url)) continue;
    const key = `${p.userId}\0${p.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** Shortest signed index distance on a circle (for cover-flow positions). */
function themeRingOffset(i: number, active: number, n: number): number {
  if (n <= 0) return 0;
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

/**
 * One activity = one portrait card.
 * Focal + multiple photos: crossfade + Ken Burns to showcase every contributor image.
 */
function ThemeFaceCard({
  theme,
  denominator,
  prioritizeImage,
  isFocal,
}: {
  theme: CommunityGalleryTheme;
  denominator: number;
  prioritizeImage: boolean;
  isFocal: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const photos = useMemo(
    () => dedupePhotos(theme.samplePhotos),
    [theme.samplePhotos]
  );
  const len = photos.length;
  const percent = Math.round(theme.percent);
  const tagBg = useMemo(() => galleryTagBackground(theme.tag), [theme.tag]);
  const hasMultiple = len > 1;

  const [baseIdx, setBaseIdx] = useState(0);
  const [overlayIdx, setOverlayIdx] = useState(() => (len > 1 ? 1 : 0));
  const [phase, setPhase] = useState<"idle" | "fadingIn">("idle");
  const [paused, setPaused] = useState(false);

  // Reset when the photo set changes (e.g., data refresh or theme swap).
  useEffect(() => {
    setBaseIdx(0);
    setOverlayIdx(len > 1 ? 1 : 0);
    setPhase("idle");
  }, [len, theme.tag]);

  const safeBaseIdx = len > 0 ? ((baseIdx % len) + len) % len : 0;
  const safeOverlayIdx = len > 0 ? ((overlayIdx % len) + len) % len : 0;
  const curr = len > 0 ? photos[safeBaseIdx] : null;

  useEffect(() => {
    if (!isFocal || !hasMultiple || paused) return;
    if (prefersReducedMotion) {
      const t = window.setInterval(() => {
        setBaseIdx((i) => (i + 1) % len);
      }, SLIDE_CYCLE_MS);
      return () => window.clearInterval(t);
    }
    const id = window.setInterval(() => {
      setPhase("fadingIn");
    }, SLIDE_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [isFocal, hasMultiple, len, paused, prefersReducedMotion]);

  function handleCrossfadeEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || e.propertyName !== "opacity") return;
    if (phase !== "fadingIn") return;
    // Fade-in finished: promote overlay to base, preload the next photo,
    // and return to idle. The overlay's opacity drops 1→0 with transition
    // disabled, so the stale image vanishes instantly under the new base.
    setBaseIdx(safeOverlayIdx);
    setOverlayIdx((safeOverlayIdx + 1) % len);
    setPhase("idle");
  }

  const cohortLine = (
    <>
      {theme.count} {theme.count === 1 ? "person" : "people"} shared this
      activity photo · {denominator} in cohort
    </>
  );

  const chip = (
    <span
      className="pointer-events-none absolute right-2.5 top-2.5 z-20 rounded-lg px-2.5 py-1 text-[11px] font-semibold lowercase tracking-wide text-white shadow-md sm:right-3 sm:top-3 sm:px-3 sm:text-xs md:text-sm"
      style={{ backgroundColor: tagBg }}
    >
      {theme.tag}
    </span>
  );

  const statsBlock = (
    <div className="pointer-events-none absolute bottom-0 left-0 z-[3] p-4 sm:p-5 md:p-6">
      <p className="text-3xl font-bold leading-none tracking-tight text-white sm:text-4xl md:text-5xl">
        {percent}%
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/90 sm:text-sm md:text-base">
        of attendees
      </p>
      <p className="mt-2 max-w-[14rem] text-[11px] leading-snug text-white/55 sm:text-xs">
        {cohortLine}
      </p>
    </div>
  );

  if (!curr) {
    return (
      <div className="relative flex aspect-[3/4] w-[260px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-zinc-950/80 p-6 text-center sm:w-[280px] sm:rounded-[1.75rem] md:w-[300px]">
        <p className="text-sm text-white/50">No photos for this theme yet.</p>
        <p className="mt-6 text-3xl font-bold text-white sm:text-4xl">{percent}%</p>
      </div>
    );
  }

  const imageSizes = isFocal
    ? "(max-width: 640px) 80vw, 300px"
    : "(max-width: 640px) 50vw, 220px";

  const ken =
    isFocal && hasMultiple && !prefersReducedMotion
      ? "motion-safe:animate-gallery-ken-burns"
      : "";

  const media =
    isFocal && hasMultiple && !prefersReducedMotion ? (
      <>
        <div className={`absolute inset-0 z-0 overflow-hidden ${ken}`}>
          <Image
            key="base"
            src={curr.url}
            alt=""
            fill
            className="object-cover object-center"
            sizes={imageSizes}
            priority={prioritizeImage}
          />
        </div>
        <div
          className="pointer-events-none absolute inset-0 z-[1] overflow-hidden motion-reduce:transition-none"
          style={{
            opacity: phase === "fadingIn" ? 1 : 0,
            transition:
              phase === "fadingIn"
                ? `opacity ${CROSSFADE_MS}ms ease-in-out`
                : "none",
          }}
          onTransitionEnd={handleCrossfadeEnd}
        >
          <div className={`relative h-full w-full ${ken}`}>
            <Image
              key="overlay"
              src={photos[safeOverlayIdx]!.url}
              alt=""
              fill
              className="object-cover object-center"
              sizes={imageSizes}
            />
          </div>
        </div>
      </>
    ) : (
      <div className={`absolute inset-0 z-0 overflow-hidden ${ken}`}>
        <Image
          key="single"
          src={curr.url}
          alt=""
          fill
          className="object-cover object-center"
          sizes={imageSizes}
          priority={prioritizeImage}
        />
      </div>
    );

  return (
    <div
      className={`relative aspect-[3/4] w-[260px] overflow-hidden rounded-[1.5rem] border border-white/12 bg-zinc-900 shadow-[0_24px_55px_-12px_rgba(0,0,0,0.92)] sm:w-[280px] sm:rounded-[1.75rem] md:w-[300px] md:rounded-[2rem] ${THEME_FLOW_EASE}`}
      onMouseEnter={() => isFocal && setPaused(true)}
      onMouseLeave={() => isFocal && setPaused(false)}
    >
      {media}
      <div
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/90 via-black/25 to-transparent"
        aria-hidden
      />
      {chip}
      {statsBlock}
    </div>
  );
}

const SWIPE_PX = 56;
const WHEEL_STEP = 14;

export function CommunityGalleryWall() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeThemeIndex, setActiveThemeIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goThemePrev = useCallback(() => {
    setActiveThemeIndex((i) => {
      const n = data?.themes.length ?? 0;
      if (n < 2) return i;
      return (i - 1 + n) % n;
    });
  }, [data?.themes.length]);

  const goThemeNext = useCallback(() => {
    setActiveThemeIndex((i) => {
      const n = data?.themes.length ?? 0;
      if (n < 2) return i;
      return (i + 1) % n;
    });
  }, [data?.themes.length]);

  useEffect(() => {
    if (!data?.themes.length) return;
    setActiveThemeIndex((i) => Math.min(i, data.themes.length - 1));
  }, [data?.themes.length]);

  /** Trackpad / mouse horizontal wheel (and shift+vertical) = same as arrow buttons. */
  useEffect(() => {
    const el = carouselRef.current;
    const count = data?.themes.length ?? 0;
    if (!el || count < 2) return;

    const onWheel = (e: WheelEvent) => {
      const dx = e.deltaX;
      const dy = e.deltaY;
      const horizontal = Math.abs(dx) > Math.abs(dy) ? dx : e.shiftKey ? dy : 0;
      if (Math.abs(horizontal) < WHEEL_STEP) return;
      e.preventDefault();
      if (horizontal > 0) goThemeNext();
      else goThemePrev();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [data?.themes.length, goThemePrev, goThemeNext]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gallery/community", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (r) => {
        let json: unknown;
        try {
          json = await r.json();
        } catch {
          if (!cancelled) {
            setError(
              r.ok
                ? "Invalid response from server."
                : `Could not load gallery (${r.status}).`
            );
          }
          return;
        }
        if (cancelled) return;
        const body = json as { success?: boolean; error?: string; data?: Payload };
        if (r.ok && body.success && body.data) {
          setData(body.data);
          return;
        }
        setError(
          body.error ??
            (r.status === 401
              ? "Sign in to view the gallery."
              : "Could not load gallery")
        );
      })
      .catch(() => {
        if (!cancelled) setError("Could not load gallery");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="text-center text-sm text-red-400" role="alert">
        {error}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[420px] max-w-6xl flex-col items-center justify-center gap-6 px-4">
        <div
          className="size-full max-h-[320px] min-h-[200px] w-full max-w-[300px] animate-pulse rounded-2xl bg-white/5"
          aria-hidden
        />
        <p className="text-center text-sm text-white/55">
          Loading the community gallery…
        </p>
      </div>
    );
  }

  if (data.themes.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
        <p>No themed photos yet.</p>
        <p className="mt-2 text-sm text-white/45">
          Complete the summit guide and add an optional activity photo — themes
          appear here as people share what they love outside of work.
        </p>
      </div>
    );
  }

  const themes = data.themes;
  const n = themes.length;
  const showNav = n > 1;
  const stepPx = 200;

  return (
    <div className="space-y-10">
      <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-white/45 sm:text-sm">
        {data.methodology}
      </p>

      <section
        className="relative mx-auto w-full max-w-6xl px-1 sm:px-4"
        aria-roledescription="carousel"
        aria-label="Activity themes"
      >
        <p className="mb-2 text-center text-sm text-white/55 tabular-nums">
          {n === 1 ? (
            <>
              Showing{" "}
              <span className="font-semibold text-white/[0.82]">1</span> common
              interest image
            </>
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-white/[0.82]">
                {activeThemeIndex + 1}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white/[0.82]">{n}</span>{" "}
              common interest images
            </>
          )}
        </p>
        {typeof data.totalLabeledPhotos === "number" &&
        data.totalLabeledPhotos > 0 ? (
          <p className="mb-2 text-center text-[11px] text-white/40 tabular-nums">
            {data.totalLabeledPhotos.toLocaleString()} labeled photos from
            attendees across these interests
          </p>
        ) : null}
        <p className="mb-2 px-1 text-center text-[11px] text-white/45">
          Swipe left or right, drag with a trackpad, or use the arrows — each moves
          the center card the same way as the buttons below.
        </p>
        <div
          ref={carouselRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              goThemeNext();
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              goThemePrev();
            }
          }}
          onTouchStart={(e) => {
            if (e.touches.length !== 1) return;
            touchStartRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            };
          }}
          onTouchEnd={(e) => {
            const start = touchStartRef.current;
            touchStartRef.current = null;
            if (!start || e.changedTouches.length !== 1 || n < 2) return;
            const x = e.changedTouches[0].clientX;
            const y = e.changedTouches[0].clientY;
            const dx = x - start.x;
            const dy = y - start.y;
            if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
            if (dx > 0) goThemePrev();
            else goThemeNext();
          }}
          className="relative mx-auto h-[min(520px,78vh)] min-h-[400px] w-full max-w-full touch-pan-y overflow-hidden pb-2 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-[540px]"
          style={{ perspective: "min(1400px, 130vw)" }}
        >
          <div className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]">
            {themes.map((theme, i) => {
                const d = themeRingOffset(i, activeThemeIndex, n);
                const absD = Math.abs(d);
                if (absD > 4) return null;

                const scale = Math.max(0.62, 1 - absD * 0.095);
                const translateX = d * stepPx;
                const rotateY = d * -32;
                const translateZ = -absD * 48;
                const zIndex = 100 - absD * 10 - (d < 0 ? 0 : 1);
                const dim = d !== 0;

                const style = {
                  transform: `
                  translate(-50%, -50%)
                  translateX(${translateX}px)
                  translateZ(${translateZ}px)
                  rotateY(${rotateY}deg)
                  scale(${scale})
                `,
                  transformStyle: "preserve-3d" as const,
                  zIndex,
                  opacity: absD > 4 ? 0 : 1 - absD * 0.06,
                  filter: dim ? "brightness(0.78)" : "none",
                };

                const exploreHref = exploreHrefForTag(theme.tag);

                return (
                  <Link
                    key={theme.tag}
                    href={exploreHref}
                    className={`absolute left-1/2 top-1/2 block ${THEME_FLOW_EASE} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
                    style={style}
                    aria-label={`Search attendees: ${theme.tag}`}
                  >
                    <ThemeFaceCard
                      theme={theme}
                      denominator={data.denominator}
                      prioritizeImage={d === 0}
                      isFocal={d === 0}
                    />
                  </Link>
                );
              })}
          </div>
        </div>

        {showNav ? (
          <div className="mt-6 flex justify-center gap-4 sm:mt-8">
            <button
              type="button"
              aria-label="Previous activity"
              onClick={goThemePrev}
              className="flex size-12 items-center justify-center rounded-full border-2 border-white/75 bg-transparent text-white shadow-sm transition hover:border-white hover:bg-white/10"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Next activity"
              onClick={goThemeNext}
              className="flex size-12 items-center justify-center rounded-full border-2 border-white/75 bg-transparent text-white shadow-sm transition hover:border-white hover:bg-white/10"
            >
              <ChevronRight className="h-6 w-6" strokeWidth={1.75} />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
