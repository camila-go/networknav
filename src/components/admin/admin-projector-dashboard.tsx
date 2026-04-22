"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const TILE_COUNT = 4;

/** Solid gradient backgrounds for the four stat tiles. Order matches the mockup. */
const TILE_ACCENTS: readonly string[] = [
  // 0 — big left (blue/indigo)
  "from-[#3b3fd6] via-[#3137b8] to-[#262a8f]",
  // 1 — top right (teal)
  "from-[#3fa1aa] via-[#2f858d] to-[#256b72]",
  // 2 — middle right small (lighter teal)
  "from-[#4fb8c2] via-[#3e9aa3] to-[#2d7f87]",
  // 3 — bottom full (orange)
  "from-[#f08a3a] via-[#dc7428] to-[#b85a1a]",
];

function formatPercent(pct: number): string {
  return `${Math.round(pct)}%`;
}

function pickPhotoUrl(theme: ProjectorThemeRow): string | null {
  for (const p of theme.samplePhotos) {
    if (isSafeGalleryImageUrl(p.url)) return p.url;
  }
  return null;
}

function buildPhotoRotation(
  themes: ProjectorThemeRow[]
): Array<{ url: string; tag: string; percent: number }> {
  const out: Array<{ url: string; tag: string; percent: number }> = [];
  for (const t of themes) {
    const url = pickPhotoUrl(t);
    if (url) out.push({ url, tag: t.tag, percent: t.percent });
  }
  return out;
}

function KenBurnsPhoto({
  url,
  direction,
}: {
  url: string;
  direction: "forward" | "reverse";
}) {
  const animClass =
    direction === "forward" ? "animate-kenburns" : "animate-kenburns-reverse";
  return (
    <div key={url} className={cn("absolute inset-0 z-0 animate-fade-in", animClass)}>
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
        className="pointer-events-none absolute right-4 top-4 z-10 rounded-lg px-3 py-1.5 text-sm font-medium lowercase text-white shadow-lg sm:text-base lg:text-lg"
        style={{ backgroundColor: galleryTagBackground(current.tag) }}
      >
        {current.tag}
      </span>
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 flex w-full flex-col gap-0.5 px-5 pb-5 text-left sm:px-6 sm:pb-6">
        <p className="text-5xl font-bold tabular-nums leading-none text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
          {formatPercent(current.percent)}
        </p>
        <p className="text-sm font-semibold text-white/90 sm:text-base lg:text-lg">
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
        : "text-3xl sm:text-4xl lg:text-5xl";
  const tagSize =
    size === "lg"
      ? "text-lg sm:text-xl lg:text-2xl"
      : size === "md"
        ? "text-sm sm:text-base lg:text-lg"
        : "text-xs sm:text-sm";
  const pad =
    size === "lg" ? "p-6 lg:p-8" : size === "md" ? "p-4 lg:p-6" : "p-3 lg:p-4";

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br shadow-lg",
        "transition-transform duration-300 ease-out",
        pulse && "scale-[1.03] ring-2 ring-white/40",
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
              "font-bold tabular-nums leading-none text-white drop-shadow",
              percentSize
            )}
          >
            {Math.round(animated)}%
          </p>
          <p
            key={theme.tag}
            className={cn(
              "animate-fade-in font-semibold lowercase text-white",
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
  const [t0, t1, t2, t3] = [
    top[0] ?? null,
    top[1] ?? null,
    top[2] ?? null,
    top[3] ?? null,
  ];

  return (
    <div className="grid h-full min-h-0 grid-cols-2 grid-rows-3 gap-3 sm:gap-4">
      <StatTile
        theme={t0}
        accent={TILE_ACCENTS[0]}
        size="lg"
        className="col-span-1 row-span-2"
      />
      <StatTile
        theme={t1}
        accent={TILE_ACCENTS[1]}
        size="md"
        className="col-span-1 row-span-1"
      />
      <StatTile
        theme={t2}
        accent={TILE_ACCENTS[2]}
        size="sm"
        className="col-span-1 row-span-1"
      />
      <StatTile
        theme={t3}
        accent={TILE_ACCENTS[3]}
        size="md"
        className="col-span-2 row-span-1"
      />
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
        "flex w-full max-w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.06)] sm:p-6 lg:p-8",
        "min-h-[520px] sm:min-h-[580px]",
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
        <div className="relative min-h-[240px] flex-1 lg:min-h-0 lg:basis-[42%]">
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
            Showing top {Math.min(TILE_COUNT, cohort.themeCount)} of {cohort.themeCount} activities.
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
