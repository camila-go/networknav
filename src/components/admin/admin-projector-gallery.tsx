"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Maximize2, Minimize2, MonitorPlay, RefreshCw, Users } from "lucide-react";
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

function ProjectorEmptySlot() {
  return (
    <div className="flex min-h-0 min-w-0 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-zinc-950/80 text-center">
      <p className="px-2 text-[10px] font-medium uppercase tracking-wide text-white/35 sm:text-xs">
        Awaiting more themes
      </p>
    </div>
  );
}

function ProjectorTile({
  theme,
  denominator,
}: {
  theme: ProjectorThemeRow;
  denominator: number;
}) {
  const img =
    theme.samplePhotos.find((p) => isSafeGalleryImageUrl(p.url)) ?? theme.samplePhotos[0];
  const tagBg = galleryTagBackground(theme.tag);
  const pct = Math.round(theme.percent);

  return (
    <div className="relative min-h-0 min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-zinc-900 shadow-lg">
      {img ? (
        <div className="absolute inset-0">
          <Image
            src={img.url}
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 1200px) 33vw, 400px"
          />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
      )}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-2 top-2 z-10 rounded-lg px-2 py-0.5 text-[10px] font-semibold lowercase text-white shadow-md sm:text-xs"
        style={{ backgroundColor: tagBg }}
      >
        {theme.tag}
      </span>
      <div className="pointer-events-none absolute bottom-0 left-0 z-10 p-2 sm:p-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
          #{theme.rank} · {theme.count}{" "}
          {theme.count === 1 ? "person" : "people"} · {theme.labeledPhotoCount} photos
        </p>
        <p className="text-2xl font-bold leading-none tracking-tight text-white sm:text-3xl md:text-4xl">
          {pct}%
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85 sm:text-xs">
          of {denominator.toLocaleString()} in cohort
        </p>
      </div>
    </div>
  );
}

export function AdminProjectorGallery() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("active");
  const [presentMode, setPresentMode] = useState(false);

  useEffect(() => {
    if (!presentMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPresentMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentMode]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
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
        setError(body.error ?? `Request failed (${r.status})`);
        return;
      }
      setData(body.data);
    } catch {
      setError("Could not load projector gallery");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cohort = data
    ? view === "active"
      ? data.activeAttendees
      : data.fullNetwork
    : null;
  const methodology =
    data && (view === "active" ? data.methodologyActive : data.methodologyNetwork);

  const slideBlock =
    cohort && methodology ? (
      <div className={cn("w-full", presentMode ? "space-y-3" : "space-y-4")}>
        {!presentMode ? (
          <>
            <div className="flex flex-wrap gap-4 text-sm text-white/70">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 tabular-nums">
                <Users className="h-4 w-4 text-cyan-400" />
                Cohort: <strong className="text-white">{cohort.denominator.toLocaleString()}</strong>{" "}
                profiles
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 tabular-nums">
                <strong className="text-white">{cohort.usersWithLabeledPhoto.toLocaleString()}</strong>{" "}
                with a labeled gallery photo
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 tabular-nums">
                <strong className="text-white">{cohort.totalLabeledPhotos.toLocaleString()}</strong>{" "}
                labeled photo rows
              </span>
              <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 tabular-nums">
                <strong className="text-white">{cohort.themeCount}</strong> distinct activity themes
              </span>
              {data?.generatedAt ? (
                <span className="text-xs text-white/40">
                  Updated {new Date(data.generatedAt).toLocaleString()}
                </span>
              ) : null}
            </div>

            <p className="text-xs leading-relaxed text-white/45">{methodology}</p>
          </>
        ) : (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-white/70">
            <span className="tabular-nums">
              <strong className="text-white">{cohort.denominator.toLocaleString()}</strong> in cohort ·
              top {Math.min(PROJECTOR_TILES, cohort.themes.length)} themes ·{" "}
              {view === "active" ? "Active attendees" : "Full network"}
            </span>
            <span className="text-xs text-white/40">
              Press Esc or click close to exit
            </span>
          </div>
        )}

        <div
          className={cn(
            "overflow-hidden rounded-xl border border-white/12 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)]",
            presentMode
              ? "aspect-video w-[min(100%,calc((100dvh-8rem)*16/9))] max-h-[calc(100dvh-8rem)] flex-1"
              : "mx-auto aspect-video w-full max-w-[min(100%,calc(100dvh*16/9))]"
          )}
          role="region"
          aria-label="Projector slide: top gallery themes"
        >
          {cohort.themes.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-white/50">
              No themed photos in this cohort yet.
            </div>
          ) : (
            <div className="grid h-full min-h-0 grid-cols-3 grid-rows-2 gap-2 p-3 sm:gap-3 sm:p-4">
              {Array.from({ length: PROJECTOR_TILES }, (_, i) => {
                const theme = cohort.themes[i];
                if (!theme) {
                  return <ProjectorEmptySlot key={`empty-${view}-${i}`} />;
                }
                return (
                  <ProjectorTile
                    key={`${view}-${theme.tag}`}
                    theme={theme}
                    denominator={cohort.denominator}
                  />
                );
              })}
            </div>
          )}
        </div>

        {!presentMode && cohort.themes.length > PROJECTOR_TILES ? (
          <p className="text-center text-xs text-white/40">
            Showing top {PROJECTOR_TILES} of {cohort.themeCount} themes.
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <div
      className={cn(
        "text-white",
        presentMode
          ? "fixed inset-0 z-50 flex flex-col bg-black p-4 md:p-6"
          : "space-y-6"
      )}
    >
      {!presentMode ? (
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MonitorPlay className="h-7 w-7 text-cyan-400" />
            Gallery projector
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-white/55">
            Same popularity themes as the public community gallery, with extra stats and a
            full-network cohort view. Framed in 16:9 for a projector or large display.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5 text-sm">
            <button
              type="button"
              onClick={() => setView("active")}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
                view === "active"
                  ? "bg-cyan-500/20 text-white"
                  : "text-white/50 hover:text-white"
              )}
            >
              Active attendees
            </button>
            <button
              type="button"
              onClick={() => setView("network")}
              className={cn(
                "rounded-md px-3 py-1.5 transition-colors",
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
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => cohort && cohort.themes.length > 0 && setPresentMode(true)}
            disabled={!cohort || cohort.themes.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40"
          >
            <Maximize2 className="h-4 w-4" />
            Present mode
          </button>
        </div>
      </header>
      ) : (
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-white/90">Gallery projector</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setView("active")}
                className={cn(
                  "rounded-md px-2.5 py-1",
                  view === "active" ? "bg-cyan-500/25 text-white" : "text-white/50"
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setView("network")}
                className={cn(
                  "rounded-md px-2.5 py-1",
                  view === "network" ? "bg-cyan-500/25 text-white" : "text-white/50"
                )}
              >
                Full network
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPresentMode(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
            >
              <Minimize2 className="h-4 w-4" />
              Exit <span className="text-white/50">(Esc)</span>
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
            presentMode ? "aspect-video flex-1" : "aspect-video w-full max-w-[min(100%,calc(100dvh*16/9))] mx-auto"
          )}
        />
      ) : null}

      <div className={cn(presentMode && "flex min-h-0 flex-1 flex-col items-center justify-center")}>
        {slideBlock}
      </div>
    </div>
  );
}
