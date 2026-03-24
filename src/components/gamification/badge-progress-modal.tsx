"use client";

import { useEffect, useState } from "react";
import { Loader2, Medal } from "lucide-react";
import type { BadgeProgress as BadgeProgressRow } from "@/lib/gamification";
import type { UserBadge } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { BADGE_TYPE_ORDER, BadgeGridTile } from "./badge-grid-tile";

function sortProgress(rows: BadgeProgressRow[]): BadgeProgressRow[] {
  const map = new Map(rows.map((r) => [r.type, r]));
  return BADGE_TYPE_ORDER.map((t) => map.get(t)).filter(Boolean) as BadgeProgressRow[];
}

export function BadgeProgressModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<BadgeProgressRow[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/activity/badges?progress=true")
      .then((r) => r.json())
      .then((data: { progress?: BadgeProgressRow[]; badges?: UserBadge[] }) => {
        if (cancelled) return;
        setProgress(Array.isArray(data.progress) ? data.progress : []);
        setBadges(Array.isArray(data.badges) ? data.badges : []);
      })
      .catch(() => {
        if (!cancelled) {
          setProgress([]);
          setBadges([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const ordered = sortProgress(progress);
  const earnedCount = badges.length;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn(
          "h-11 w-11 shrink-0 rounded-xl border-white/15 bg-white/5 text-cyan-300",
          "hover:bg-white/10 hover:text-cyan-200 focus-visible:ring-cyan-500"
        )}
        aria-label="View badge progress and achievements"
      >
        <Medal className="h-5 w-5" aria-hidden />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "max-h-[min(85vh,720px)] w-full max-w-2xl gap-0 overflow-hidden p-0",
            "border-white/10 bg-[#0a1628] text-white sm:rounded-xl"
          )}
        >
          <DialogHeader className="space-y-1 border-b border-white/10 px-6 py-5 text-left">
            <DialogTitle className="pr-8 font-display text-xl font-semibold text-white">
              Achievements
            </DialogTitle>
            <DialogDescription className="text-sm text-white/55">
              What you unlock here shows on your profile—each tier is proof you're building real relationships. Message, connect, meet, and stay consistent to move from bronze through gold.
              {earnedCount > 0 ? (
                <span className="mt-1 block text-cyan-400/90">
                  {earnedCount} tier{earnedCount !== 1 ? "s" : ""} earned
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(min(85vh,720px)-8rem)] overflow-y-auto px-6 py-5">
            {loading && (
              <div className="flex justify-center py-16 text-white/50">
                <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading achievements" />
              </div>
            )}

            {!loading && ordered.length === 0 && (
              <p className="py-12 text-center text-sm text-white/50">
                Achievement data is not available right now. Try again later.
              </p>
            )}

            {!loading && ordered.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {ordered.map((row) => (
                  <BadgeGridTile
                    key={row.type}
                    type={row.type}
                    tier={row.currentTier}
                    progress={row}
                    layout="achievements"
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
