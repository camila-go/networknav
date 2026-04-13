"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { Maximize2, Minimize2, MonitorPlay, RefreshCw, Users } from "lucide-react";
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

const TILE_FOOTNOTE = "of network";

/** Match Figma presentation frame: hero + 4-tile bento (+ optional 5th row). */
const PROJECTOR_TILES = 6;

const PROJECTOR_POLL_MS = 50_000;

/** Figma presentation — solid stat panels. */
const SOLID_PURPLE = "bg-[#3940ab]";
const SOLID_TEAL = "bg-[#4a9ba4]";
const SOLID_ORANGE = "bg-[#ed7e35]";

/** Hero category cap (Figma “fishing” pill). */
const HERO_TAG_PILL = "bg-[#4ba61b]";

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

function collectCohortMosaicUrls(themes: ProjectorThemeRow[], max: number): string[] {
  const urls: string[] = [];
  for (const t of themes) {
    for (const p of t.samplePhotos) {
      if (isSafeGalleryImageUrl(p.url) && !urls.includes(p.url)) {
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

function ProjectorEmptySlot({
  accentIndex,
  mosaicUrls = [],
}: {
  accentIndex: number;
  mosaicUrls?: string[];
}) {
  const grad = SOLID_ACCENTS[accentIndex % SOLID_ACCENTS.length];
  const urls = padCollageFour(mosaicUrls.slice(0, 4));
  return (
    <div
      className={cn(
        "relative flex min-h-[120px] items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br p-3 text-center lg:min-h-[160px]",
        grad,
        "opacity-[0.92]"
      )}
    >
      {urls.length > 0 ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 grid grid-cols-2 grid-rows-2 gap-px bg-black/50"
          aria-hidden
        >
          {urls.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative min-h-0">
              <Image
                src={url}
                alt=""
                fill
                unoptimized
                className="object-cover object-center"
                sizes="120px"
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-black/55" aria-hidden />
      <p className="relative z-[2] text-xs font-semibold uppercase tracking-[0.12em] text-white/85">
        Awaiting theme
      </p>
    </div>
  );
}

/** Large left hero — Figma fishing card. */
function ProjectorHeroFigma({
  theme,
  cohortThemes,
  belowPctLabel,
}: {
  theme: ProjectorThemeRow;
  cohortThemes: ProjectorThemeRow[];
  belowPctLabel: string;
}) {
  const primaryUrl =
    theme.samplePhotos.find((p) => isSafeGalleryImageUrl(p.url))?.url ?? null;
  const fallbackUrls = primaryUrl
    ? []
    : pickFallbackPhotoUrls(cohortThemes, theme.tag, 4);
  const urlsForCollage = primaryUrl ? [primaryUrl] : fallbackUrls;
  const useCollage = Boolean(!primaryUrl && fallbackUrls.length >= 2);
  const pct = Math.round(theme.percent);

  return (
    <div className="relative h-full min-h-[280px] w-full min-w-0 overflow-hidden rounded-[28px] border border-white/10 shadow-2xl lg:min-h-0">
      {urlsForCollage.length > 0 ? (
        useCollage ? (
          <div className="absolute inset-0 z-0 grid grid-cols-2 grid-rows-2 gap-px bg-black">
            {padCollageFour(urlsForCollage).map((url, idx) => (
              <div key={`${url}-${idx}`} className="relative min-h-0">
                <Image
                  src={url}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  priority
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 z-0">
            <Image
              src={urlsForCollage[0]}
              alt=""
              fill
              unoptimized
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
            />
          </div>
        )
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black" />
      )}
      <div
        className="pointer-events-none absolute inset-0 z-[1] rounded-[28px]"
        style={{
          background:
            "linear-gradient(21.5deg, rgba(0,0,0,0.88) 8%, rgba(0,0,0,0) 72%)",
        }}
        aria-hidden
      />
      <span
        className={cn(
          "pointer-events-none absolute right-4 top-4 z-10 rounded-xl px-5 py-2.5 text-lg font-medium lowercase text-white shadow-lg sm:right-6 sm:top-6 sm:text-2xl lg:text-3xl",
          HERO_TAG_PILL
        )}
      >
        {theme.tag}
      </span>
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-full flex-col items-center gap-1 px-4 pb-8 pt-16 text-center sm:pb-10 lg:items-start lg:px-8 lg:pb-10 lg:text-left">
        <p className="text-6xl font-bold tabular-nums leading-none tracking-tight text-white drop-shadow-lg sm:text-7xl lg:text-8xl xl:text-[7.5rem]">
          {pct}%
        </p>
        <p className="text-2xl font-bold text-white/95 sm:text-3xl lg:text-4xl xl:text-5xl">
          {belowPctLabel}
        </p>
      </div>
    </div>
  );
}

/** Centered stat card — purple / teal / orange columns from Figma. */
function ProjectorSolidFigma({
  theme,
  className,
  size = "tall",
}: {
  theme: ProjectorThemeRow;
  className: string;
  size?: "tall" | "short";
}) {
  const pct = Math.round(theme.percent);
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border border-white/10 px-4 py-6 text-center shadow-lg sm:gap-5 sm:px-6 sm:py-8",
        className
      )}
    >
      <span
        className="absolute right-3 top-3 z-10 rounded-lg px-2 py-1 text-[10px] font-semibold lowercase text-white/90 ring-1 ring-white/20 sm:text-xs"
        style={{ backgroundColor: galleryTagBackground(theme.tag) }}
      >
        {theme.tag}
      </span>
      <p
        className={cn(
          "font-bold tabular-nums leading-none text-white",
          size === "tall"
            ? "text-6xl sm:text-7xl lg:text-8xl xl:text-[6.5rem]"
            : "text-5xl sm:text-6xl lg:text-7xl"
        )}
      >
        {pct}%
      </p>
      <p
        className={cn(
          "max-w-[95%] font-bold capitalize leading-tight text-white",
          size === "tall" ? "text-xl sm:text-2xl lg:text-3xl xl:text-4xl" : "text-lg sm:text-xl lg:text-2xl"
        )}
      >
        {theme.tag}
      </p>
    </div>
  );
}

/** Photo tile with centered stats — Figma kayaking card. */
function ProjectorPhotoCenterFigma({
  theme,
  cohortThemes,
}: {
  theme: ProjectorThemeRow;
  cohortThemes: ProjectorThemeRow[];
}) {
  const primaryUrl =
    theme.samplePhotos.find((p) => isSafeGalleryImageUrl(p.url))?.url ?? null;
  const fallbackUrls = primaryUrl
    ? []
    : pickFallbackPhotoUrls(cohortThemes, theme.tag, 1);
  const url = primaryUrl ?? fallbackUrls[0];
  const pct = Math.round(theme.percent);

  return (
    <div className="relative min-h-[140px] w-full min-w-0 overflow-hidden rounded-[28px] border border-white/10 shadow-lg lg:min-h-0">
      {url ? (
        <div className="absolute inset-0 z-0">
          <Image
            src={url}
            alt=""
            fill
            unoptimized
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 22vw"
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-700 to-black" />
      )}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-black/35" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-3 text-center">
        <p className="text-5xl font-bold tabular-nums text-white drop-shadow-md sm:text-6xl lg:text-7xl">
          {pct}%
        </p>
        <p className="text-lg font-bold capitalize text-white drop-shadow sm:text-xl lg:text-2xl">
          {theme.tag}
        </p>
      </div>
    </div>
  );
}

function FigmaInsightHeader({
  methodologyLine,
  cohort,
  generatedAt,
  presentMode,
}: {
  methodologyLine: string;
  cohort: CohortBlock;
  generatedAt: string;
  presentMode: boolean;
}) {
  return (
    <div className="shrink-0 rounded-[28px] border border-white/10 bg-black px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
      <h2
        className={cn(
          "font-bold leading-tight text-[#5dc4dc]",
          presentMode ? "text-2xl sm:text-3xl lg:text-4xl" : "text-xl sm:text-2xl lg:text-3xl xl:text-4xl"
        )}
      >
        What the network is into
      </h2>
      <p
        className={cn(
          "mt-2 leading-snug text-white/90",
          presentMode ? "text-sm sm:text-base" : "text-xs sm:text-sm lg:text-base"
        )}
      >
        {methodologyLine}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-white/55 sm:text-xs">
        <span className="rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 font-medium text-white">
          Full network
        </span>
        <span className="rounded-lg border border-white/10 px-2 py-1 tabular-nums">
          <strong className="text-white">{cohort.denominator.toLocaleString()}</strong> in cohort
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-cyan-400" />
          <strong className="text-white/90">{cohort.usersWithLabeledPhoto.toLocaleString()}</strong>{" "}
          w/ photo
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 tabular-nums text-emerald-400/90">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live · {new Date(generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

/**
 * Figma 89:2 — left hero, right: header + 3×2 grid (purple | teal / photo | orange).
 * Row 3: optional two tiles for themes 5–6.
 */
function FigmaProjectorBody({
  themes,
  cohortThemes,
  belowPctLabel,
  methodologyLine,
  cohort,
  generatedAt,
  presentMode,
}: {
  themes: ProjectorThemeRow[];
  cohortThemes: ProjectorThemeRow[];
  belowPctLabel: string;
  methodologyLine: string;
  cohort: CohortBlock;
  generatedAt: string;
  presentMode: boolean;
}) {
  const emptyMosaic = collectCohortMosaicUrls(cohortThemes, 4);
  const t = themes;

  if (t.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-1 items-center justify-center p-8 text-center text-white/50">
        No themed photos in this cohort yet.
      </div>
    );
  }

  const hero = t[0];
  const a = t[1];
  const b = t[2];
  const c = t[3];
  const d = t[4];
  const e = t[5];

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:flex-row lg:gap-4 lg:p-5"
      )}
    >
      <div className="min-h-[320px] w-full shrink-0 lg:min-h-0 lg:w-[40%] lg:max-w-xl lg:flex-1">
        <ProjectorHeroFigma
          theme={hero}
          cohortThemes={cohortThemes}
          belowPctLabel={belowPctLabel}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:gap-4">
        <FigmaInsightHeader
          methodologyLine={methodologyLine}
          cohort={cohort}
          generatedAt={generatedAt}
          presentMode={presentMode}
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-3 lg:grid-rows-2 lg:gap-3">
          {a ? (
            <div className="min-h-[200px] lg:row-span-2 lg:min-h-0">
              <ProjectorSolidFigma theme={a} className={SOLID_PURPLE} size="tall" />
            </div>
          ) : (
            <div className="min-h-[200px] lg:row-span-2">
              <ProjectorEmptySlot accentIndex={1} mosaicUrls={emptyMosaic} />
            </div>
          )}

          {b ? (
            <div className="min-h-[160px] lg:col-start-2 lg:row-start-1 lg:min-h-0">
              <ProjectorSolidFigma theme={b} className={SOLID_TEAL} size="short" />
            </div>
          ) : (
            <div className="lg:col-start-2 lg:row-start-1">
              <ProjectorEmptySlot accentIndex={2} mosaicUrls={emptyMosaic} />
            </div>
          )}

          {c ? (
            <div className="min-h-[180px] lg:col-start-2 lg:row-start-2 lg:min-h-0">
              <ProjectorPhotoCenterFigma theme={c} cohortThemes={cohortThemes} />
            </div>
          ) : (
            <div className="lg:col-start-2 lg:row-start-2">
              <ProjectorEmptySlot accentIndex={3} mosaicUrls={emptyMosaic} />
            </div>
          )}

          {d ? (
            <div className="min-h-[220px] lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:min-h-0">
              <ProjectorSolidFigma theme={d} className={SOLID_ORANGE} size="tall" />
            </div>
          ) : (
            <div className="min-h-[220px] lg:col-start-3 lg:row-span-2 lg:row-start-1">
              <ProjectorEmptySlot accentIndex={4} mosaicUrls={emptyMosaic} />
            </div>
          )}
        </div>

        {e ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ProjectorSolidFigma theme={e} className="bg-[#6b21a8]" size="short" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProjectorSlideFrame({
  presentMode,
  children,
}: {
  presentMode: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full max-w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#141e21] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
        "min-h-[520px] sm:min-h-[560px]",
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

export function AdminProjectorGallery() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    if (!presentMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresentMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentMode]);

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
        if (!silent) {
          setError(body.error ?? `Request failed (${r.status})`);
        }
        return;
      }
      setData(body.data);
      hasLoadedOnceRef.current = true;
    } catch {
      if (!silent) {
        setError("Could not load projector gallery");
      }
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
      if (document.visibilityState === "visible") {
        void load({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const cohort = data?.cohort ?? null;

  const generatedAt = data?.generatedAt ?? new Date().toISOString();
  const methodologyLine =
    data?.methodology ??
    "Share of all registered users who labeled a gallery photo with each activity.";

  const slideBlock = cohort ? (
    <div className={cn("w-full max-w-full", presentMode ? "space-y-3" : "space-y-4")}>
      <ProjectorSlideFrame presentMode={presentMode}>
        <FigmaProjectorBody
          themes={cohort.themes.slice(0, PROJECTOR_TILES)}
          cohortThemes={cohort.themes}
          belowPctLabel={TILE_FOOTNOTE}
          methodologyLine={methodologyLine}
          cohort={cohort}
          generatedAt={generatedAt}
          presentMode={presentMode}
        />
      </ProjectorSlideFrame>

      {!presentMode && cohort.themes.length > PROJECTOR_TILES ? (
        <p className="text-center text-[11px] text-white/40 sm:text-xs">
          Showing top {PROJECTOR_TILES} of {cohort.themeCount} themes.
        </p>
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
              Event slide layout inspired by App exploration — large gallery hero and colorful
              theme stats. Present mode fills the screen.
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
              onClick={() => cohort && cohort.themes.length > 0 && setPresentMode(true)}
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
          <h2 className="text-base font-semibold text-white/90 sm:text-lg">Gallery projector</h2>
          <button
            type="button"
            onClick={() => setPresentMode(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/15 sm:px-3 sm:text-sm"
          >
            <Minimize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Exit <span className="hidden text-white/50 sm:inline">(Esc)</span>
          </button>
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
