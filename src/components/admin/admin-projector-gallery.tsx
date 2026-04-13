"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { LayoutGrid, Maximize2, Minimize2, MonitorPlay, RefreshCw, Users } from "lucide-react";
import { galleryTagBackground } from "@/lib/gallery/tag-accent";
import { isSafeGalleryImageUrl } from "@/lib/gallery/safe-image-url";
import { cn } from "@/lib/utils";
import type { ProjectorThemeRow } from "@/types/gallery";

type ViewMode = "active" | "network";

type CohortBlock = {
  denominator: number;
  totalLabeledPhotos: number;
  usersWithLabeledPhoto: number;
  themeCount: number;
  themes: ProjectorThemeRow[];
};

type Payload = {
  generatedAt: string;
  methodologyActive: string;
  methodologyNetwork: string;
  activeAttendees: CohortBlock;
  fullNetwork: CohortBlock;
};

const PROJECTOR_TILES = 6;

/** Auto-refresh interval for event displays (ms). */
const PROJECTOR_POLL_MS = 50_000;

/** Tint overlays on photo tiles (keeps color rhythm from earlier solid blocks). */
const PHOTO_ACCENTS = [
  "from-[#2563eb]/55 via-[#1d4ed8]/35 to-transparent",
  "from-[#0d9488]/50 via-[#0f766e]/30 to-transparent",
  "from-[#ea580c]/45 via-[#c2410c]/25 to-transparent",
  "from-[#7c3aed]/50 via-[#6d28d9]/30 to-transparent",
  "from-[#db2777]/45 via-[#be185d]/25 to-transparent",
] as const;

/** Placeholder / empty-slot wash. */
const SOLID_ACCENTS = [
  "from-[#2563eb] via-[#1d4ed8] to-[#1e3a8a]",
  "from-[#0d9488] via-[#0f766e] to-[#134e4a]",
  "from-[#ea580c] via-[#c2410c] to-[#9a3412]",
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

/** Fill a 2×2 hero collage when we only have 1–3 distinct fallback URLs. */
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
        "relative flex min-h-[100px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-3 text-center sm:min-h-[120px]",
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
              <Image src={url} alt="" fill className="object-cover object-center" sizes="120px" />
            </div>
          ))}
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-black/55" aria-hidden />
      <p className="relative z-[2] text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85 sm:text-xs">
        Awaiting theme
      </p>
    </div>
  );
}

function ProjectorPhotoTile({
  theme,
  denominator,
  hero,
  belowPctLabel,
  cohortThemes,
  accentOverlay,
  compact,
}: {
  theme: ProjectorThemeRow;
  denominator: number;
  hero?: boolean;
  belowPctLabel?: string;
  /** Full cohort list for fallback images when this theme has no safe URL. */
  cohortThemes: ProjectorThemeRow[];
  accentOverlay?: string;
  compact?: boolean;
}) {
  const primaryUrl =
    theme.samplePhotos.find((p) => isSafeGalleryImageUrl(p.url))?.url ?? null;
  const fallbackUrls = primaryUrl
    ? []
    : pickFallbackPhotoUrls(cohortThemes, theme.tag, hero ? 4 : 2);
  const urlsForCollage = primaryUrl ? [primaryUrl] : fallbackUrls;
  const useCollage = Boolean(hero && !primaryUrl && fallbackUrls.length >= 2);
  const tagBg = galleryTagBackground(theme.tag);
  const pct = Math.round(theme.percent);
  const sizesHero = "(max-width: 1024px) 100vw, 45vw";
  const sizesTile = "(max-width: 1024px) 50vw, 22vw";

  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0 overflow-hidden rounded-2xl border border-white/15 shadow-xl",
        hero ? "ring-1 ring-cyan-500/25" : "ring-0"
      )}
    >
      {urlsForCollage.length > 0 ? (
        useCollage ? (
          <div className="absolute inset-0 z-0 grid grid-cols-2 grid-rows-2 gap-px bg-black">
            {padCollageFour(urlsForCollage).map((url, idx) => (
              <div key={`${url}-${idx}`} className="relative min-h-0">
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes={sizesHero}
                  priority={hero}
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
              className="object-cover object-center"
              sizes={hero ? sizesHero : sizesTile}
              priority={hero}
            />
          </div>
        )
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-700 via-zinc-900 to-black" />
      )}
      {accentOverlay ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br mix-blend-hard-light",
            accentOverlay
          )}
          aria-hidden
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/95 via-black/35 to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-2 top-2 z-10 rounded-lg px-2 py-0.5 text-[10px] font-semibold lowercase text-white shadow-md sm:right-3 sm:top-3 sm:text-xs"
        style={{ backgroundColor: tagBg }}
      >
        {theme.tag}
      </span>
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 p-3 sm:p-4 lg:p-5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-white/75 sm:text-[11px]">
          #{theme.rank} · {theme.count}{" "}
          {theme.count === 1 ? "person" : "people"} · {theme.labeledPhotoCount} photos
        </p>
        <p
          className={cn(
            "font-bold leading-none tracking-tight text-white drop-shadow-lg",
            compact
              ? "text-2xl sm:text-3xl lg:text-4xl"
              : hero
                ? "text-4xl sm:text-5xl lg:text-7xl"
                : "text-3xl sm:text-4xl lg:text-5xl"
          )}
        >
          {pct}%
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-white/90 sm:text-xs">
          {belowPctLabel ?? `of ${denominator.toLocaleString()} in cohort`}
        </p>
      </div>
    </div>
  );
}

type TileRender =
  | { kind: "hero-photo" }
  | { kind: "photo"; accentOverlay?: (typeof PHOTO_ACCENTS)[number] };

/** Bento: large hero + photo tiles with optional color wash (all slots prefer real gallery imagery). */
const TILE_LAYOUT: TileRender[] = [
  { kind: "hero-photo" },
  { kind: "photo", accentOverlay: PHOTO_ACCENTS[0] },
  { kind: "photo" },
  { kind: "photo", accentOverlay: PHOTO_ACCENTS[1] },
  { kind: "photo" },
  { kind: "photo", accentOverlay: PHOTO_ACCENTS[2] },
];

function BentoProjectorGrid({
  themes,
  cohortThemes,
  denominator,
  viewKey,
  belowPctLabel,
}: {
  themes: ProjectorThemeRow[];
  /** All themes in cohort (for image fallbacks + empty-slot mosaic). */
  cohortThemes: ProjectorThemeRow[];
  denominator: number;
  viewKey: string;
  /** Slide mode: short line under % (cohort size lives in the rail). */
  belowPctLabel?: string;
}) {
  const emptyMosaic = collectCohortMosaicUrls(cohortThemes, 4);

  return (
    <div
      className={cn(
        "grid h-full min-h-0 w-full flex-1 auto-rows-fr gap-2 p-2 sm:gap-3 sm:p-3 lg:p-4",
        /* Mobile / tablet: stack; hero first; 2-col when space */
        "grid-cols-1",
        "sm:grid-cols-2",
        /* Large: asymmetric bento — hero 6×3, colored strips, tall accent */
        "lg:grid-cols-12 lg:grid-rows-3 lg:gap-3"
      )}
    >
      {TILE_LAYOUT.map((layout, i) => {
        const theme = themes[i];
        const cell = (() => {
          if (!theme) {
            return (
              <ProjectorEmptySlot
                key={`e-${i}`}
                accentIndex={i}
                mosaicUrls={emptyMosaic}
              />
            );
          }
          if (layout.kind === "hero-photo") {
            return (
              <ProjectorPhotoTile
                key={theme.tag}
                theme={theme}
                denominator={denominator}
                hero
                belowPctLabel={belowPctLabel}
                cohortThemes={cohortThemes}
              />
            );
          }
          return (
            <ProjectorPhotoTile
              key={theme.tag}
              theme={theme}
              denominator={denominator}
              belowPctLabel={belowPctLabel}
              cohortThemes={cohortThemes}
              accentOverlay={layout.accentOverlay}
              compact={i === 3}
            />
          );
        })();

        return (
          <div
            key={`${viewKey}-slot-${i}`}
            className={cn(
              "min-h-0 min-w-0",
              /* sm: hero spans full width */
              i === 0 && "sm:col-span-2",
              /* Large-screen placement */
              i === 0 &&
                "lg:col-span-6 lg:row-span-3 lg:row-start-1 lg:col-start-1 lg:min-h-[200px]",
              i === 1 &&
                "lg:col-span-4 lg:row-span-1 lg:row-start-1 lg:col-start-7 lg:min-h-[120px]",
              i === 2 &&
                "lg:col-span-2 lg:row-span-1 lg:row-start-2 lg:col-start-7 lg:min-h-[100px]",
              i === 3 &&
                "lg:col-span-2 lg:row-span-1 lg:row-start-2 lg:col-start-9 lg:min-h-[100px]",
              i === 4 &&
                "lg:col-span-4 lg:row-span-1 lg:row-start-3 lg:col-start-7 lg:min-h-[110px]",
              i === 5 &&
                "lg:col-span-2 lg:row-span-3 lg:row-start-1 lg:col-start-11 lg:min-h-[120px]"
            )}
          >
            {cell}
          </div>
        );
      })}
    </div>
  );
}

function methodologyBlurb(view: ViewMode): string {
  return view === "active"
    ? "Share of active attendees who labeled a gallery photo with each activity."
    : "Share of all registered profiles who labeled a gallery photo with each activity.";
}

function tileFootnoteForView(view: ViewMode): string {
  return view === "active" ? "of attendees" : "of network";
}

function ProjectorSlideFrame({
  view,
  cohort,
  methodologyLine,
  generatedAt,
  presentMode,
  children,
}: {
  view: ViewMode;
  cohort: CohortBlock;
  methodologyLine: string;
  generatedAt: string;
  presentMode: boolean;
  children: ReactNode;
}) {
  const cohortTitle = view === "active" ? "Active attendees" : "Full network";

  return (
    <div
      className={cn(
        "flex w-full max-w-full flex-col overflow-hidden rounded-xl border border-white/12 bg-[#070708] shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
        "min-h-[480px] sm:min-h-[520px]",
        "lg:aspect-video lg:min-h-0 lg:flex-row",
        presentMode
          ? "max-h-[min(calc(100dvh-7.5rem),min(92vw*9/16,92dvh))] flex-1 lg:max-h-[min(calc(100dvh-8rem),min(92vw*9/16,88dvh))]"
          : "mx-auto lg:max-w-[min(100%,min(100vw-2rem,calc(92dvh*16/9)))]"
      )}
      role="region"
      aria-label="Gallery themes presentation slide"
    >
      <aside
        className={cn(
          "flex shrink-0 flex-col justify-between gap-4 border-white/10 bg-black p-4 sm:p-5",
          "border-b lg:w-[32%] lg:min-w-[220px] lg:max-w-[320px] lg:border-b-0 lg:border-r lg:py-6"
        )}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/35 bg-cyan-500/10">
              <LayoutGrid className="h-5 w-5 text-cyan-400" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
                Live gallery themes
              </p>
              <h2
                className={cn(
                  "font-bold leading-tight tracking-tight text-white",
                  presentMode ? "text-xl sm:text-2xl" : "text-lg sm:text-xl lg:text-2xl"
                )}
              >
                What the network is into
              </h2>
            </div>
          </div>
          <p
            className={cn(
              "leading-snug text-white/65",
              presentMode ? "text-xs sm:text-sm" : "text-[11px] sm:text-xs"
            )}
          >
            {methodologyLine}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white">
              {cohortTitle}
            </span>
            <span className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] tabular-nums text-white/80">
              <strong className="text-white">{cohort.denominator.toLocaleString()}</strong> in cohort
            </span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-white/55 sm:text-xs">
            <li className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-cyan-500/80" />
              <span>
                <strong className="text-white/90">{cohort.usersWithLabeledPhoto.toLocaleString()}</strong>{" "}
                with a labeled photo
              </span>
            </li>
            <li>
              <strong className="text-white/90">{cohort.totalLabeledPhotos.toLocaleString()}</strong>{" "}
              photo labels ·{" "}
              <strong className="text-white/90">{cohort.themeCount}</strong> themes
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-3 text-[10px] text-white/45 sm:text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400/90">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" aria-hidden />
            Live
          </span>
          <span className="tabular-nums">
            Updated {new Date(generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </span>
        </div>
      </aside>

      <div className="relative min-h-0 min-w-0 flex-1 bg-gradient-to-br from-[#0a4d4d]/55 via-[#0a1214] to-black">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(45,212,191,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative flex h-full min-h-[280px] flex-1 flex-col lg:min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}

export function AdminProjectorGallery() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<ViewMode>("active");
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

  const cohort = data
    ? view === "active"
      ? data.activeAttendees
      : data.fullNetwork
    : null;

  const generatedAt = data?.generatedAt ?? new Date().toISOString();
  const methodologyLine = methodologyBlurb(view);
  const tileBelowPct = tileFootnoteForView(view);

  const slideBlock = cohort ? (
    <div className={cn("w-full max-w-full", presentMode ? "space-y-3" : "space-y-4")}>
      <ProjectorSlideFrame
        view={view}
        cohort={cohort}
        methodologyLine={methodologyLine}
        generatedAt={generatedAt}
        presentMode={presentMode}
      >
        {cohort.themes.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-1 items-center justify-center p-8 text-center text-white/50">
            No themed photos in this cohort yet.
          </div>
        ) : (
          <BentoProjectorGrid
            themes={cohort.themes.slice(0, PROJECTOR_TILES)}
            cohortThemes={cohort.themes}
            denominator={cohort.denominator}
            viewKey={view}
            belowPctLabel={tileBelowPct}
          />
        )}
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
              Popularity themes in a bento layout: photos and color blocks. Toggle cohort below;
              use Present mode for slides.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setView("active")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 sm:px-3",
                  view === "active"
                    ? "bg-cyan-500/20 text-white"
                    : "text-white/50 hover:text-white"
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setView("network")}
                className={cn(
                  "rounded-md px-2.5 py-1.5 sm:px-3",
                  view === "network"
                    ? "bg-cyan-500/20 text-white"
                    : "text-white/50 hover:text-white"
                )}
              >
                Full network
              </button>
            </div>
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
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5 text-[11px] sm:text-xs">
              <button
                type="button"
                onClick={() => setView("active")}
                className={cn(
                  "rounded-md px-2 py-1 sm:px-2.5",
                  view === "active" ? "bg-cyan-500/25 text-white" : "text-white/50"
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setView("network")}
                className={cn(
                  "rounded-md px-2 py-1 sm:px-2.5",
                  view === "network" ? "bg-cyan-500/25 text-white" : "text-white/50"
                )}
              >
                Network
              </button>
            </div>
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
