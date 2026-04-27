"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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

type ThemeCarouselCard = {
  theme: CommunityGalleryTheme;
  photos: GalleryPhoto[];
};

const THEME_FLOW_EASE = "transition-[transform,opacity,filter] duration-500 ease-out";

const SLIDESHOW_DISSOLVE_MS = 120;
const SLIDESHOW_START_DELAY_MS = 120;
const SLIDESHOW_HOLD_MS = 4000;

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

function dedupePhotosForTheme(theme: CommunityGalleryTheme): GalleryPhoto[] {
  const seen = new Set<string>();
  const out: GalleryPhoto[] = [];
  for (const photo of theme.samplePhotos) {
    if (!isSafeGalleryImageUrl(photo.url)) continue;
    const key = `${photo.userId}\0${photo.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(photo);
  }
  return out;
}

/** One carousel card per activity tag; photos are de-duplicated within the theme. */
function oneCardPerTheme(themes: CommunityGalleryTheme[]): ThemeCarouselCard[] {
  const out: ThemeCarouselCard[] = [];
  for (const theme of themes) {
    const photos = dedupePhotosForTheme(theme);
    if (photos.length === 0) continue;
    out.push({ theme, photos });
  }
  return out;
}

/** Shortest signed index distance on a circle (for cover-flow positions). */
function ringOffset(i: number, active: number, n: number): number {
  if (n <= 0) return 0;
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

const SLIDESHOW_IMAGE_CLASS =
  "object-cover object-[center_25%]";

function ThemePhotoSlideshow({
  photos,
  isFocal,
  prioritizeImage,
  imageSizes,
}: {
  photos: GalleryPhoto[];
  isFocal: boolean;
  prioritizeImage: boolean;
  imageSizes: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const fadeEndCommittedRef = useRef(false);

  const n = photos.length;
  const nextIdx = n > 0 ? (idx + 1) % n : 0;

  const photoKey = useMemo(
    () => photos.map((p) => `${p.userId}\0${p.url}`).join("|"),
    [photos]
  );

  useEffect(() => {
    setIdx(0);
    setIsFading(false);
    fadeEndCommittedRef.current = false;
  }, [photoKey]);

  useEffect(() => {
    if (!isFocal) {
      setIsFading(false);
      setIdx(0);
      fadeEndCommittedRef.current = false;
    }
  }, [isFocal]);

  useEffect(() => {
    if (!isFocal || n < 2 || reducedMotion) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const startDelay = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setIsFading((fading) => (fading ? fading : true));
      }, SLIDESHOW_HOLD_MS);
    }, SLIDESHOW_START_DELAY_MS);

    return () => {
      window.clearTimeout(startDelay);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [isFocal, n, reducedMotion]);

  const handleFadeEnd = useCallback(() => {
    if (fadeEndCommittedRef.current) return;
    fadeEndCommittedRef.current = true;
    // Defer index swap and fade reset so the compositor can finish the opacity
    // transition before React swaps Image src (avoids one-frame flash / jump).
    requestAnimationFrame(() => {
      setIdx((i) => (i + 1) % n);
      requestAnimationFrame(() => {
        setIsFading(false);
        fadeEndCommittedRef.current = false;
      });
    });
  }, [n]);

  if (n === 0) return null;

  if (n === 1) {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        <Image
          src={photos[0].url}
          alt=""
          fill
          className={SLIDESHOW_IMAGE_CLASS}
          sizes={imageSizes}
          priority={prioritizeImage}
        />
      </div>
    );
  }

  const dissolveStyle = {
    transition: `opacity ${SLIDESHOW_DISSOLVE_MS}ms linear`,
    ...(isFading ? { willChange: "opacity" as const } : {}),
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          ...dissolveStyle,
          opacity: isFading ? 0 : 1,
          zIndex: isFading ? 1 : 2,
        }}
        onTransitionEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.propertyName !== "opacity" || !isFading) return;
          handleFadeEnd();
        }}
      >
        <Image
          src={photos[idx].url}
          alt=""
          fill
          className={SLIDESHOW_IMAGE_CLASS}
          sizes={imageSizes}
          priority={prioritizeImage && !isFading}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{
          ...dissolveStyle,
          opacity: isFading ? 1 : 0,
          zIndex: isFading ? 2 : 1,
        }}
      >
        <Image
          src={photos[nextIdx].url}
          alt=""
          fill
          className={SLIDESHOW_IMAGE_CLASS}
          sizes={imageSizes}
          priority={false}
        />
      </div>
    </div>
  );
}

/** One category = one portrait card; multiple photos dissolve inside when focal. */
function ThemeCarouselCardView({
  theme,
  photos,
  denominator,
  prioritizeImage,
  isFocal,
}: {
  theme: CommunityGalleryTheme;
  photos: GalleryPhoto[];
  denominator: number;
  prioritizeImage: boolean;
  isFocal: boolean;
}) {
  const percent = Math.round(theme.percent);
  const tagBg = useMemo(() => galleryTagBackground(theme.tag), [theme.tag]);

  const imageSizes = isFocal
    ? "(max-width: 640px) 92vw, 380px"
    : "(max-width: 640px) 50vw, 220px";

  /** Full-bleed under card radius (inset frame was exposing bg as grey bars). */
  const photoFrameClass = "absolute inset-0 z-0 overflow-hidden";

  return (
    <div
      className={`relative aspect-[3/4] w-[min(92vw,380px)] overflow-hidden rounded-[1.5rem] bg-zinc-950 shadow-[0_24px_55px_-12px_rgba(0,0,0,0.92)] sm:w-[min(90vw,320px)] sm:rounded-[1.75rem] md:w-[300px] md:rounded-[2rem] ${THEME_FLOW_EASE}`}
    >
      <div className={photoFrameClass}>
        <ThemePhotoSlideshow
          photos={photos}
          isFocal={isFocal}
          prioritizeImage={prioritizeImage}
          imageSizes={imageSizes}
        />
      </div>
      <div
        className={`pointer-events-none z-[2] bg-gradient-to-t from-black via-black/92 via-black/35 to-transparent ${photoFrameClass}`}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 px-[clamp(1.25rem,5vw,2rem)] pt-[max(1.125rem,calc(0.875rem+env(safe-area-inset-top,0px)))] sm:px-7 sm:pt-6 md:px-8 md:pt-7">
        <div className="flex justify-end">
          <span
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold lowercase tracking-wide text-white shadow-md sm:px-3.5 sm:py-1.5 sm:text-xs md:text-sm"
            style={{ backgroundColor: tagBg }}
          >
            {theme.tag}
          </span>
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] max-w-full px-[clamp(1.25rem,5vw,2rem)] pb-[max(1.5rem,calc(1.125rem+env(safe-area-inset-bottom,0px)))] pt-11 text-left sm:px-7 sm:pb-8 sm:pt-14 md:px-8 md:pb-9 md:pt-16"
      >
        <p className="text-3xl font-bold leading-none tracking-tight text-white sm:text-4xl md:text-5xl">
          {percent}%
        </p>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-white/90 sm:mt-2 sm:text-sm md:text-base">
          of attendees
        </p>
        <p className="mt-2.5 max-w-[min(100%,18rem)] text-pretty text-[11px] leading-relaxed text-white/70 sm:mt-3 sm:max-w-[20rem] sm:text-xs sm:leading-snug">
          {theme.count} {theme.count === 1 ? "person" : "people"} shared this
          activity photo · {denominator} in cohort
        </p>
      </div>
    </div>
  );
}

const SWIPE_PX = 56;
const WHEEL_STEP = 14;

export function CommunityGalleryWall() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const cards = useMemo(
    () => (data ? oneCardPerTheme(data.themes) : []),
    [data]
  );
  const cardCount = cards.length;

  const goPrev = useCallback(() => {
    setActiveIndex((i) => {
      if (cardCount < 2) return i;
      return (i - 1 + cardCount) % cardCount;
    });
  }, [cardCount]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => {
      if (cardCount < 2) return i;
      return (i + 1) % cardCount;
    });
  }, [cardCount]);

  useEffect(() => {
    if (cardCount === 0) return;
    setActiveIndex((i) => Math.min(i, cardCount - 1));
  }, [cardCount]);

  /** Trackpad / mouse horizontal wheel (and shift+vertical) = same as arrow buttons. */
  useEffect(() => {
    const el = carouselRef.current;
    if (!el || cardCount < 2) return;

    const onWheel = (e: WheelEvent) => {
      const dx = e.deltaX;
      const dy = e.deltaY;
      const horizontal = Math.abs(dx) > Math.abs(dy) ? dx : e.shiftKey ? dy : 0;
      if (Math.abs(horizontal) < WHEEL_STEP) return;
      e.preventDefault();
      if (horizontal > 0) goNext();
      else goPrev();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [cardCount, goPrev, goNext]);

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

  if (cardCount === 0) {
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

  const showNav = cardCount > 1;
  const stepPx = 200;
  const totalLabeled = data.totalLabeledPhotos;

  return (
    <div className="space-y-10">
      <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-white/45 sm:text-sm">
        {data.methodology}
      </p>

      <section
        className="relative mx-auto w-full max-w-6xl px-1 sm:px-4"
        aria-roledescription="carousel"
        aria-label="Attendee activity photos by category"
      >
        <p className="mb-2 text-center text-sm text-white/55 tabular-nums">
          {cardCount === 1 ? (
            <>
              Showing{" "}
              <span className="font-semibold text-white/[0.82]">1</span>{" "}
              activity
              {typeof totalLabeled === "number" && totalLabeled > 0 ? (
                <>
                  {" "}
                  <span className="text-white/40">
                    · {totalLabeled} labeled photo
                    {totalLabeled !== 1 ? "s" : ""} in the gallery
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-white/[0.82]">
                {activeIndex + 1}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white/[0.82]">
                {cardCount}
              </span>{" "}
              {cardCount === 1 ? "activity" : "activities"}
              {typeof totalLabeled === "number" && totalLabeled > 0 ? (
                <>
                  {" "}
                  <span className="text-white/40">
                    · {totalLabeled} labeled photo
                    {totalLabeled !== 1 ? "s" : ""} total
                  </span>
                </>
              ) : null}
            </>
          )}
        </p>
        <p className="mb-2 px-1 text-center text-[11px] text-white/45">
          Swipe left or right, drag with a trackpad, or use the arrows — each
          moves the center card the same way as the buttons below.
        </p>
        <div
          ref={carouselRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") {
              e.preventDefault();
              goNext();
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              goPrev();
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
            if (!start || e.changedTouches.length !== 1 || cardCount < 2) return;
            const x = e.changedTouches[0].clientX;
            const y = e.changedTouches[0].clientY;
            const dx = x - start.x;
            const dy = y - start.y;
            if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
            if (dx > 0) goPrev();
            else goNext();
          }}
          className="relative mx-auto h-[min(560px,82vh)] min-h-[min(440px,72dvh)] w-full max-w-full touch-pan-y overflow-hidden pb-2 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:h-[560px] sm:min-h-[400px]"
          style={{ perspective: "min(1400px, 130vw)" }}
        >
          <div className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]">
            {cards.map((card, i) => {
              const d = ringOffset(i, activeIndex, cardCount);
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

              const exploreHref = exploreHrefForTag(card.theme.tag);
              const photoCount = card.photos.length;
              const ariaLabel =
                photoCount > 1
                  ? `Search attendees: ${card.theme.tag}, ${photoCount} photos in this category`
                  : `Search attendees: ${card.theme.tag}`;

              return (
                <Link
                  key={card.theme.tag}
                  href={exploreHref}
                  className={`absolute left-1/2 top-1/2 block ${THEME_FLOW_EASE} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
                  style={style}
                  aria-label={ariaLabel}
                >
                  <ThemeCarouselCardView
                    theme={card.theme}
                    photos={card.photos}
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
              onClick={goPrev}
              className="flex size-12 items-center justify-center rounded-full border-2 border-white/75 bg-transparent text-white shadow-sm transition hover:border-white hover:bg-white/10"
            >
              <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Next activity"
              onClick={goNext}
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
