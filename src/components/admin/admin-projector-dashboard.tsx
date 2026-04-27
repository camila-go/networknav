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
import { Maximize2, Minimize2, MonitorPlay, RefreshCw } from "lucide-react";
import { galleryTagBackground } from "@/lib/gallery/tag-accent";
import { isSafeGalleryImageUrl } from "@/lib/gallery/safe-image-url";
import { useAnimatedNumber } from "@/lib/hooks/use-animated-number";
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

const POLL_MS = 12_000;
const PHOTO_ROTATE_MS = 5_000;
const TILE_COUNT = 10;

/** Solid gradient backgrounds for stat tiles (index 0–9). */
const TILE_ACCENTS: readonly string[] = [
  "from-[#3b3fd6] via-[#3137b8] to-[#262a8f]",
  "from-[#3fa1aa] via-[#2f858d] to-[#256b72]",
  "from-[#4fb8c2] via-[#3e9aa3] to-[#2d7f87]",
  "from-[#f08a3a] via-[#dc7428] to-[#b85a1a]",
  "from-[#7c3aed] via-[#5b21b6] to-[#4c1d95]",
  "from-[#db2777] via-[#be185d] to-[#9d174d]",
  "from-[#0d9488] via-[#0f766e] to-[#115e59]",
  "from-[#ca8a04] via-[#a16207] to-[#854d0e]",
  "from-[#4f46e5] via-[#4338ca] to-[#3730a3]",
  "from-[#0ea5e9] via-[#0284c7] to-[#0369a1]",
];

function formatPercent(pct: number): string {
  return `${Math.round(pct)}%`;
}

function buildPhotoRotation(
  themes: ProjectorThemeRow[]
): Array<{ url: string; tag: string; percent: number }> {
  const seen = new Set<string>();
  const out: Array<{ url: string; tag: string; percent: number }> = [];
  for (const t of themes) {
    for (const p of t.samplePhotos) {
      if (!isSafeGalleryImageUrl(p.url)) continue;
      if (seen.has(p.url)) continue;
      seen.add(p.url);
      out.push({ url: p.url, tag: t.tag, percent: t.percent });
    }
  }
  return out;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

function KenBurnsPhoto({
  url,
  direction,
}: {
  url: string;
  direction: "forward" | "reverse";
}) {
  const reduceMotion = usePrefersReducedMotion();
  const animClass =
    direction === "forward"
      ? "motion-safe:animate-kenburns"
      : "motion-safe:animate-kenburns-reverse";
  return (
    <div
      key={url}
      className={cn("absolute inset-0 z-0 animate-fade-in", !reduceMotion && animClass)}
    >
      <Image
        src={url}
        alt=""
        fill
        unoptimized
        className="object-cover object-center"
        sizes="(max-width: 1024px) 100vw, 42vw"
        priority
      />
    </div>
  );
}

function PhotoCard({
  rotation,
  photoIndex,
}: {
  rotation: Array<{ url: string; tag: string; percent: number }>;
  photoIndex: number;
}) {
  const current = rotation.length > 0 ? rotation[photoIndex % rotation.length] : null;
  const direction: "forward" | "reverse" = photoIndex % 2 === 0 ? "forward" : "reverse";

  if (!current) {
    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
      <KenBurnsPhoto url={current.url} direction={direction} />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(8deg, rgba(0,0,0,0.85) 2%, rgba(0,0,0,0.35) 48%, rgba(0,0,0,0) 85%)",
        }}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-2 top-2 z-10 rounded-md px-2 py-1 text-xs font-medium lowercase text-white shadow-lg sm:right-4 sm:top-4 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm lg:text-base"
        style={{ backgroundColor: galleryTagBackground(current.tag) }}
      >
        {current.tag}
      </span>
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-full flex-col gap-0.5 px-3 pb-3 text-left sm:px-6 sm:pb-6">
        <p className="text-3xl font-bold tabular-nums leading-none text-white drop-shadow-lg sm:text-5xl lg:text-7xl">
          {formatPercent(current.percent)}
        </p>
        <p className="text-xs font-semibold text-white/90 sm:text-base lg:text-lg">
          of attendees
        </p>
      </div>
    </div>
  );
}

function StatTile({
  theme,
  accent,
  className,
  size,
}: {
  theme: ProjectorThemeRow | null;
  accent: string;
  className?: string;
  size: "lg" | "md" | "sm";
}) {
  const target = theme?.percent ?? 0;
  const animated = useAnimatedNumber(target, 800);
  const [pulse, setPulse] = useState(false);
  const prevPercentRef = useRef<number | null>(null);

  useEffect(() => {
    if (theme == null) return;
    const prev = prevPercentRef.current;
    prevPercentRef.current = theme.percent;
    if (prev === null) return;
    if (Math.round(prev) === Math.round(theme.percent)) return;
    setPulse(true);
    const id = window.setTimeout(() => setPulse(false), 450);
    return () => window.clearTimeout(id);
  }, [theme?.percent, theme]);

  const percentSize =
    size === "lg"
      ? "text-7xl sm:text-8xl lg:text-9xl"
      : size === "md"
        ? "text-5xl sm:text-6xl lg:text-7xl"
        : "text-xl leading-tight max-md:tracking-tight sm:text-2xl md:text-3xl lg:text-4xl";
  const tagSize =
    size === "lg"
      ? "text-lg sm:text-xl lg:text-2xl"
      : size === "md"
        ? "text-sm sm:text-base lg:text-lg"
        : "text-[11px] leading-snug max-md:line-clamp-2 sm:text-xs md:text-sm";
  const pad =
    size === "lg" ? "p-6 lg:p-8" : size === "md" ? "p-4 lg:p-6" : "p-2.5 sm:p-3 md:p-4";

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col justify-start gap-1 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br shadow-lg sm:gap-1.5 md:justify-between md:gap-0",
        "transition-transform duration-300 ease-out",
        pulse && "max-md:ring-2 max-md:ring-white/30 md:scale-[1.03] md:ring-2 md:ring-white/40",
        accent,
        pad,
        className
      )}
    >
      {theme ? (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-white/0 transition-colors duration-500"
            style={{ backgroundColor: pulse ? "rgba(255,255,255,0.08)" : "transparent" }}
          />
          <p
            className={cn(
              "shrink-0 font-bold tabular-nums text-white drop-shadow max-md:leading-none md:leading-none",
              percentSize
            )}
          >
            {Math.round(animated)}%
          </p>
          <p
            key={theme.tag}
            className={cn(
              "min-h-0 shrink-0 animate-fade-in font-semibold lowercase text-white max-md:break-words",
              tagSize
            )}
          >
            {theme.tag}
          </p>
        </>
      ) : (
        <>
          <p className={cn("font-bold tabular-nums leading-none text-white/30", percentSize)}>
            —
          </p>
          <p className={cn("font-semibold text-white/40", tagSize)}>
            no data
          </p>
        </>
      )}
    </div>
  );
}

function StatsGrid({ themes }: { themes: ProjectorThemeRow[] }) {
  const top = useMemo(() => themes.slice(0, TILE_COUNT), [themes]);
  const slots = useMemo(() => {
    const row: Array<ProjectorThemeRow | null> = [];
    for (let i = 0; i < TILE_COUNT; i++) row.push(top[i] ?? null);
    return row;
  }, [top]);

  return (
    <div
      className={cn(
        "grid h-full min-h-0 gap-2 sm:gap-2.5",
        /* minmax(0,1fr) rows collapse on short mobile viewports and text stacks overlap — use content-sized rows < md */
        "grid-cols-2 auto-rows-min max-md:grid-rows-none md:grid-rows-2 md:auto-rows-fr md:grid-cols-5 md:gap-3"
      )}
    >
      {slots.map((theme, i) => (
        <StatTile
          key={i}
          theme={theme}
          accent={TILE_ACCENTS[i] ?? TILE_ACCENTS[0]}
          size="sm"
          className="min-h-0"
        />
      ))}
    </div>
  );
}

function DashboardFrame({
  presentMode,
  children,
}: {
  presentMode: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full max-w-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-6 lg:p-8",
        "min-h-[min(520px,72dvh)] sm:min-h-[560px]",
        "lg:aspect-video lg:min-h-0",
        presentMode
          ? "max-h-[min(calc(100dvh-6rem),min(95vw*9/16,94dvh))] flex-1"
          : "mx-auto lg:max-w-[min(100%,min(100vw-2rem,calc(92dvh*16/9)))]"
      )}
      role="region"
      aria-label="Gallery activity stats dashboard"
    >
      {children}
    </div>
  );
}

export function AdminProjectorDashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presentMode, setPresentMode] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const hasLoadedOnceRef = useRef(false);

  const themes = useMemo(() => data?.cohort.themes ?? [], [data?.cohort.themes]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) {
      setError(null);
      if (hasLoadedOnceRef.current) setRefreshing(true);
      else setLoading(true);
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
      if (!silent) setError("Could not load projector dashboard");
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
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void load({ silent: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const rotation = useMemo(() => buildPhotoRotation(themes), [themes]);

  // Cycle photo every PHOTO_ROTATE_MS.
  useEffect(() => {
    if (rotation.length <= 1) return;
    const id = window.setInterval(() => {
      setPhotoIndex((i) => (i + 1) % rotation.length);
    }, PHOTO_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [rotation.length]);

  // Clamp photoIndex if rotation shrinks.
  useEffect(() => {
    if (rotation.length === 0) return;
    setPhotoIndex((i) => i % rotation.length);
  }, [rotation.length]);

  // Esc exits present mode.
  useEffect(() => {
    if (!presentMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresentMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentMode]);

  const cohort = data?.cohort ?? null;
  const generatedAt = data?.generatedAt ?? new Date().toISOString();
  const hasThemes = themes.length > 0;

  const dashboard = (
    <DashboardFrame presentMode={presentMode}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="relative min-h-[200px] flex-1 sm:min-h-[220px] lg:min-h-0 lg:basis-[42%]">
          <PhotoCard rotation={rotation} photoIndex={photoIndex} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:basis-[58%]">
          <header className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">
              What the network is into
            </h2>
            <p className="text-xs leading-relaxed text-white/55 sm:text-sm">
              Share of active attendees who labeled a gallery photo with each activity.
            </p>
          </header>
          <div className="min-h-0 flex-1">
            {hasThemes ? (
              <StatsGrid themes={themes} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50">
                No themed photos in this cohort yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardFrame>
  );

  return (
    <div
      className={cn(
        "w-full min-w-0 text-white",
        presentMode
          ? "fixed inset-0 z-50 flex flex-col bg-black px-3 pt-[max(0.75rem,calc(0.75rem+env(safe-area-inset-top)))] pb-[max(0.75rem,calc(0.75rem+env(safe-area-inset-bottom)))] pl-[max(0.75rem,calc(0.75rem+env(safe-area-inset-left)))] pr-[max(0.75rem,calc(0.75rem+env(safe-area-inset-right)))] sm:px-4 sm:pt-4 sm:pb-4 md:px-6 md:pt-6 md:pb-6"
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
              Live stats dashboard. Tiles update as attendees label gallery photos —
              refreshing every {Math.round(POLL_MS / 1000)}s. Press Esc to exit present mode.
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
              onClick={() => setPresentMode(true)}
              disabled={!hasThemes}
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
            "animate-pulse rounded-[28px] bg-white/5",
            presentMode ? "min-h-[60dvh] flex-1" : "min-h-[480px] w-full sm:min-h-[560px]"
          )}
        />
      ) : (
        <div
          className={cn(
            presentMode &&
              "flex min-h-0 flex-1 flex-col items-stretch justify-center overflow-auto"
          )}
        >
          {dashboard}
        </div>
      )}

      {!presentMode && cohort ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/50 sm:text-xs">
          <span>
            Showing top {Math.min(TILE_COUNT, cohort.themeCount)} of{" "}
            {cohort.themeCount} activities.
          </span>
          <span className="inline-flex items-center gap-1.5 tabular-nums text-emerald-400/90">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live · {new Date(generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            {" · "}
            {cohort.usersWithLabeledPhoto.toLocaleString()} with photo
          </span>
        </div>
      ) : null}
    </div>
  );
}
