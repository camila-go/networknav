"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  Maximize2,
  Minimize2,
  MonitorPlay,
  Pause,
  Play,
  RefreshCw,
  Users,
} from "lucide-react";
import { galleryTagBackground } from "@/lib/gallery/tag-accent";
import { isSafeGalleryImageUrl } from "@/lib/gallery/safe-image-url";
import { cn } from "@/lib/utils";
import type { ProjectorThemeRow } from "@/types/gallery";

type CohortBlock = {
  denominator: number;
  totalLabeledPhotos: number;
  usersWithLabeledPhoto: number;
  themeCount: number;
  themes: ProjectorThemeRow[];
};

type Payload = {
  generatedAt: string;
  methodology: string;
  cohort: CohortBlock;
};

const PROJECTOR_POLL_MS = 50_000;
const ADVANCE_MS = 8_000;
const DEEP_DIVE_CADENCE = 4;
const DEEP_DIVE_MIN_PROFILES = 3;

const SOLID_ACCENTS = [
  "from-[#3940ab] via-[#2d3485] to-[#252e7a]",
  "from-[#4a9ba4] via-[#3d858d] to-[#2f6b73]",
  "from-[#ed7e35] via-[#d96a28] to-[#c45a1e]",
  "from-[#7c3aed] via-[#6d28d9] to-[#5b21b6]",
  "from-[#db2777] via-[#be185d] to-[#9d174d]",
] as const;

function pickFallbackPhotoUrls(
  themes: ProjectorThemeRow[],
  excludeTag: string,
  max: number
): string[] {
  const urls: string[] = [];
  for (const t of themes) {
    if (t.tag === excludeTag) continue;
    for (const p of t.samplePhotos) {
      if (isSafeGalleryImageUrl(p.url)) {
        urls.push(p.url);
        if (urls.length >= max) return urls;
      }
    }
  }
  return urls;
}

function padCollageFour(urls: string[]): string[] {
  if (urls.length === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < 4; i++) out.push(urls[i % urls.length]);
  return out;
}

function isDeepDiveSlot(index: number, theme: ProjectorThemeRow): boolean {
  if (index % DEEP_DIVE_CADENCE !== DEEP_DIVE_CADENCE - 1) return false;
  return theme.enrichment.profiledUserCount >= DEEP_DIVE_MIN_PROFILES;
}

function heroPhoto(
  theme: ProjectorThemeRow,
  allThemes: ProjectorThemeRow[]
): { urls: string[]; collage: boolean } {
  const primary = theme.samplePhotos.find((p) => isSafeGalleryImageUrl(p.url))?.url;
  if (primary) return { urls: [primary], collage: false };
  const fallback = pickFallbackPhotoUrls(allThemes, theme.tag, 4);
  if (fallback.length >= 2) return { urls: padCollageFour(fallback), collage: true };
  if (fallback.length === 1) return { urls: fallback, collage: false };
  return { urls: [], collage: false };
}

function formatPercent(pct: number): string {
  return `${Math.round(pct)}%`;
}

function PhotoCanvas({
  urls,
  collage,
  kenburnsDirection,
  sizes,
}: {
  urls: string[];
  collage: boolean;
  kenburnsDirection: "forward" | "reverse";
  sizes: string;
}) {
  const animClass =
    kenburnsDirection === "forward" ? "animate-kenburns" : "animate-kenburns-reverse";

  if (urls.length === 0) {
    return (
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
    );
  }

  if (collage) {
    return (
      <div className={cn("absolute inset-0 z-0 grid grid-cols-2 grid-rows-2 gap-px bg-black", animClass)}>
        {urls.map((url, idx) => (
          <div key={`${url}-${idx}`} className="relative min-h-0">
            <Image
              src={url}
              alt=""
              fill
              unoptimized
              className="object-cover object-center"
              sizes={sizes}
              priority={idx === 0}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 z-0", animClass)}>
      <Image
        src={urls[0]}
        alt=""
        fill
        unoptimized
        className="object-cover object-center"
        sizes={sizes}
        priority
      />
    </div>
  );
}

/** Full-bleed cinematic slide — photo hero with big stat overlay and rank comparison. */
function SlideHero({
  theme,
  prevTheme,
  nextTheme,
  allThemes,
  direction,
}: {
  theme: ProjectorThemeRow;
  prevTheme: ProjectorThemeRow | null;
  nextTheme: ProjectorThemeRow | null;
  allThemes: ProjectorThemeRow[];
  direction: "forward" | "reverse";
}) {
  const { urls, collage } = heroPhoto(theme, allThemes);
  const comparisonParts: string[] = [];
  if (prevTheme) comparisonParts.push(`less than ${prevTheme.tag}`);
  if (nextTheme) comparisonParts.push(`more than ${nextTheme.tag}`);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <PhotoCanvas
        urls={urls}
        collage={collage}
        kenburnsDirection={direction}
        sizes="100vw"
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(12deg, rgba(0,0,0,0.92) 4%, rgba(0,0,0,0.55) 42%, rgba(0,0,0,0.05) 78%)",
        }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-6 top-6 z-10 rounded-xl px-5 py-2.5 text-xl font-medium lowercase text-white shadow-lg sm:text-2xl lg:text-3xl"
        style={{ backgroundColor: galleryTagBackground(theme.tag) }}
      >
        {theme.tag}
      </span>
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-full flex-col gap-2 px-6 pb-10 text-left sm:px-10 sm:pb-12 lg:px-14 lg:pb-14">
        <p className="text-7xl font-bold tabular-nums leading-none tracking-tight text-white drop-shadow-lg sm:text-8xl lg:text-9xl xl:text-[10rem]">
          {formatPercent(theme.percent)}
        </p>
        <p className="text-2xl font-semibold leading-tight text-white/95 sm:text-4xl lg:text-5xl">
          of the network{" "}
          <span className="text-white/80">are into</span>{" "}
          <span className="lowercase">{theme.tag}</span>
        </p>
        {comparisonParts.length > 0 ? (
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.18em] text-white/65 sm:text-base">
            {comparisonParts.join(" · ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Photo-left, stats-right deep-dive slide tied to the activity's user cohort. */
function SlideDeepDive({
  theme,
  allThemes,
  direction,
}: {
  theme: ProjectorThemeRow;
  allThemes: ProjectorThemeRow[];
  direction: "forward" | "reverse";
}) {
  const { urls, collage } = heroPhoto(theme, allThemes);
  const e = theme.enrichment;
  const tagColor = galleryTagBackground(theme.tag);

  const topTitle = e.topTitles[0];
  const topLocation = e.topLocations[0];
  const topCompany = e.topCompanies[0];

  const accents = [SOLID_ACCENTS[0], SOLID_ACCENTS[2], SOLID_ACCENTS[3]];

  const factRows: Array<{ label: string; value: string; accent: string }> = [];
  if (topTitle) {
    factRows.push({
      label: "Top role",
      value: `${topTitle.value} · ${topTitle.count}`,
      accent: accents[0],
    });
  }
  if (topLocation) {
    factRows.push({
      label: "Top location",
      value: `${topLocation.value} · ${Math.round(topLocation.percent)}%`,
      accent: accents[1],
    });
  }
  if (topCompany) {
    factRows.push({
      label: "Top company",
      value: `${topCompany.value} · ${topCompany.count}`,
      accent: accents[2],
    });
  }
  if (e.topGrowthArea) {
    factRows.push({
      label: "Growth area",
      value: e.topGrowthArea,
      accent: SOLID_ACCENTS[1],
    });
  }
  if (e.topTalkTopic) {
    factRows.push({
      label: "Talk topic",
      value: e.topTalkTopic,
      accent: SOLID_ACCENTS[4],
    });
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black lg:flex-row">
      <div className="relative min-h-[240px] flex-1 overflow-hidden lg:min-h-0 lg:basis-[62%]">
        <PhotoCanvas
          urls={urls}
          collage={collage}
          kenburnsDirection={direction}
          sizes="(max-width: 1024px) 100vw, 62vw"
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(8deg, rgba(0,0,0,0.85) 2%, rgba(0,0,0,0.35) 48%, rgba(0,0,0,0) 85%)",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-full flex-col gap-1 px-6 pb-8 sm:px-10 sm:pb-10">
          <p className="text-6xl font-bold tabular-nums leading-none text-white drop-shadow-lg sm:text-7xl lg:text-8xl">
            {formatPercent(theme.percent)}
          </p>
          <p className="text-xl font-semibold lowercase text-white/90 sm:text-3xl lg:text-4xl">
            {theme.tag}
          </p>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-col gap-3 bg-[#0b1013] p-5 sm:p-6 lg:basis-[38%] lg:gap-4 lg:p-8">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: tagColor }}
            aria-hidden
          />
          <h3 className="text-xl font-bold text-white sm:text-2xl lg:text-3xl">
            <span className="lowercase">{theme.tag}</span>{" "}
            <span className="text-white/60">by the numbers</span>
          </h3>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-white/45 sm:text-sm">
          Based on {e.profiledUserCount} {e.profiledUserCount === 1 ? "attendee" : "attendees"} who tagged this activity
        </p>

        <div className="flex min-h-0 flex-1 flex-col gap-2 sm:gap-3">
          {factRows.length === 0 ? (
            <p className="text-sm text-white/50">No attendee detail available yet.</p>
          ) : (
            factRows.map((row) => (
              <div
                key={row.label}
                className={cn(
                  "flex items-baseline justify-between gap-4 rounded-xl border border-white/10 bg-gradient-to-br px-4 py-3 shadow-sm sm:px-5 sm:py-4",
                  row.accent
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 sm:text-xs">
                  {row.label}
                </span>
                <span className="truncate text-right text-base font-bold text-white sm:text-lg lg:text-xl">
                  {row.value}
                </span>
              </div>
            ))
          )}
        </div>

        {e.sampleCaption ? (
          <figure className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 sm:px-5 sm:py-4">
            <blockquote className="text-sm italic leading-snug text-white/90 sm:text-base">
              &ldquo;{e.sampleCaption.text}&rdquo;
            </blockquote>
            <figcaption className="mt-2 text-[11px] uppercase tracking-[0.12em] text-white/55 sm:text-xs">
              — {e.sampleCaption.userName}
            </figcaption>
          </figure>
        ) : null}
      </div>
    </div>
  );
}

function SlideFrame({
  presentMode,
  children,
}: {
  presentMode: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full max-w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
        "min-h-[480px] sm:min-h-[540px]",
        "lg:aspect-video lg:min-h-0",
        presentMode
          ? "max-h-[min(calc(100dvh-7.5rem),min(92vw*9/16,92dvh))] flex-1 lg:max-h-[min(calc(100dvh-8rem),min(92vw*9/16,88dvh))]"
          : "mx-auto lg:max-w-[min(100%,min(100vw-2rem,calc(92dvh*16/9)))]"
      )}
      role="region"
      aria-label="Gallery themes presentation slide"
    >
      <div className="relative min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SlideProgress({
  index,
  total,
  paused,
  tag,
}: {
  index: number;
  total: number;
  paused: boolean;
  tag: string;
}) {
  const fill = total > 0 ? ((index + 1) / total) * 100 : 0;
  return (
    <div className="flex shrink-0 items-center gap-4 px-2 pt-3 text-xs text-white/70 sm:text-sm">
      <span className="tabular-nums text-white/80">
        {index + 1} <span className="text-white/40">/</span> {total}
      </span>
      <div
        className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + 1}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${fill}%` }}
        />
      </div>
      <span className="truncate lowercase text-white/60">{tag}</span>
      <span className="inline-flex items-center gap-1 text-white/50">
        {paused ? (
          <>
            <Pause className="h-3.5 w-3.5" /> paused
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" /> auto
          </>
        )}
      </span>
    </div>
  );
}

function SlideContent({
  theme,
  prevTheme,
  nextTheme,
  allThemes,
  index,
}: {
  theme: ProjectorThemeRow;
  prevTheme: ProjectorThemeRow | null;
  nextTheme: ProjectorThemeRow | null;
  allThemes: ProjectorThemeRow[];
  index: number;
}) {
  const direction: "forward" | "reverse" = index % 2 === 0 ? "forward" : "reverse";
  if (isDeepDiveSlot(index, theme)) {
    return <SlideDeepDive theme={theme} allThemes={allThemes} direction={direction} />;
  }
  return (
    <SlideHero
      theme={theme}
      prevTheme={prevTheme}
      nextTheme={nextTheme}
      allThemes={allThemes}
      direction={direction}
    />
  );
}

export function AdminProjectorGallery() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const themes = data?.cohort.themes ?? [];
  const total = themes.length;

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) {
      setError(null);
      if (hasLoadedOnceRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }
    try {
      const r = await fetch("/api/admin/gallery-projector", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = (await r.json()) as {
        success?: boolean;
        error?: string;
        data?: Payload;
      };
      if (!r.ok || !body.success || !body.data) {
        if (!silent) setError(body.error ?? `Request failed (${r.status})`);
        return;
      }
      setData(body.data);
      hasLoadedOnceRef.current = true;
    } catch {
      if (!silent) setError("Could not load projector gallery");
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void load({ silent: true });
    };
    const id = window.setInterval(tick, PROJECTOR_POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  // Clamp slide index when theme count changes (e.g., after silent refresh).
  useEffect(() => {
    if (total === 0) return;
    setSlideIndex((i) => Math.min(i, total - 1));
  }, [total]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (total === 0) return;
      const clamped = ((nextIndex % total) + total) % total;
      setSlideIndex(clamped);
    },
    [total]
  );

  const advance = useCallback(() => goTo(slideIndex + 1), [goTo, slideIndex]);
  const retreat = useCallback(() => goTo(slideIndex - 1), [goTo, slideIndex]);

  // Auto-advance while presenting.
  useEffect(() => {
    if (!presentMode || paused || total <= 1) return;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % total);
    }, ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [presentMode, paused, total, slideIndex]);

  // Keyboard controls.
  useEffect(() => {
    if (!presentMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPresentMode(false);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        retreat();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentMode, advance, retreat]);

  const current = total > 0 ? themes[slideIndex] : null;
  const prev = total > 0 && slideIndex > 0 ? themes[slideIndex - 1] : null;
  const next =
    total > 0 && slideIndex < total - 1 ? themes[slideIndex + 1] : null;

  const slideKey = useMemo(
    () => (current ? `${slideIndex}:${current.tag}` : "empty"),
    [current, slideIndex]
  );

  const cohort = data?.cohort ?? null;
  const generatedAt = data?.generatedAt ?? new Date().toISOString();

  const slideBlock = cohort ? (
    <div
      className={cn(
        "flex w-full max-w-full flex-col",
        presentMode ? "gap-3" : "gap-4"
      )}
    >
      <SlideFrame presentMode={presentMode}>
        {current ? (
          <div key={slideKey} className="relative h-full w-full animate-fade-in">
            <SlideContent
              theme={current}
              prevTheme={prev}
              nextTheme={next}
              allThemes={themes}
              index={slideIndex}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center text-white/50">
            No themed photos in this cohort yet.
          </div>
        )}
      </SlideFrame>

      {presentMode && current ? (
        <SlideProgress
          index={slideIndex}
          total={total}
          paused={paused}
          tag={current.tag}
        />
      ) : null}

      {!presentMode && cohort.themes.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/50 sm:text-xs">
          <span>
            Preview showing slide 1. Present mode cycles through all {cohort.themeCount} themes.
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums text-emerald-400/90">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live · {new Date(generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            {" · "}
            <Users className="inline h-3 w-3 text-cyan-400" />{" "}
            {cohort.usersWithLabeledPhoto.toLocaleString()} with photo
          </span>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div
      className={cn(
        "w-full min-w-0 text-white",
        presentMode
          ? "fixed inset-0 z-50 flex flex-col bg-black p-3 sm:p-4 md:p-6"
          : "space-y-5 sm:space-y-6"
      )}
    >
      {!presentMode ? (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold sm:text-2xl">
              <MonitorPlay className="h-6 w-6 shrink-0 text-cyan-400 sm:h-7 sm:w-7" />
              Gallery projector
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/55 sm:text-sm">
              Cinematic slideshow of attendee gallery photos. Present mode auto-advances every
              {" "}{Math.round(ADVANCE_MS / 1000)}s — use ← / → to navigate, space to pause, Esc to exit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs hover:bg-white/10 disabled:opacity-50 sm:px-3 sm:text-sm"
            >
              <RefreshCw
                className={cn(
                  "h-3.5 w-3.5 sm:h-4 sm:w-4",
                  (loading || refreshing) && "animate-spin"
                )}
              />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                if (!cohort || cohort.themes.length === 0) return;
                setSlideIndex(0);
                setPaused(false);
                setPresentMode(true);
              }}
              disabled={!cohort || cohort.themes.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-2 text-xs text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40 sm:px-3 sm:text-sm"
            >
              <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Present
            </button>
          </div>
        </header>
      ) : (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-white/90 sm:text-lg">
            Gallery projector
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/15 sm:px-3 sm:text-sm"
              aria-pressed={paused}
            >
              {paused ? (
                <>
                  <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Play
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Pause
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPresentMode(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/15 sm:px-3 sm:text-sm"
            >
              <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Exit <span className="hidden text-white/50 sm:inline">(Esc)</span>
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <div
          className={cn(
            "animate-pulse rounded-xl bg-white/5",
            presentMode ? "min-h-[60dvh] flex-1" : "min-h-[400px] w-full sm:min-h-[480px]"
          )}
        />
      ) : null}

      <div
        className={cn(
          presentMode && "flex min-h-0 flex-1 flex-col items-stretch justify-center overflow-auto"
        )}
      >
        {slideBlock}
      </div>
    </div>
  );
}
