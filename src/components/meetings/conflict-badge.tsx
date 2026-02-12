"use client";

import { AlertTriangle } from "lucide-react";
import type { FreeBusySlot, CalendarEvent } from "@/types";

interface ConflictBadgeProps {
  proposedTime: Date;
  duration: number;
  myEvents: CalendarEvent[];
  recipientBusy: FreeBusySlot[];
}

function hasOverlap(
  start: Date,
  end: Date,
  slotStart: Date | string,
  slotEnd: Date | string
): boolean {
  const s = new Date(slotStart).getTime();
  const e = new Date(slotEnd).getTime();
  return start.getTime() < e && end.getTime() > s;
}

export function ConflictBadge({
  proposedTime,
  duration,
  myEvents,
  recipientBusy,
}: ConflictBadgeProps) {
  const endTime = new Date(proposedTime.getTime() + duration * 60000);

  const myConflict = myEvents.some((e) =>
    hasOverlap(proposedTime, endTime, e.startTime, e.endTime)
  );
  const theirConflict = recipientBusy.some((s) =>
    hasOverlap(proposedTime, endTime, s.startTime, s.endTime)
  );

  if (!myConflict && !theirConflict) return null;

  const message =
    myConflict && theirConflict
      ? "Conflicts with both calendars"
      : myConflict
        ? "Conflicts with your calendar"
        : "Conflicts with their calendar";

  return (
    <span
      className="inline-flex items-center gap-1 text-xs text-amber-400"
      title={message}
    >
      <AlertTriangle className="h-3 w-3" />
      {message}
    </span>
  );
}
