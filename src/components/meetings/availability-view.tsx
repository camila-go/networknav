"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Calendar, Loader2, LinkIcon } from "lucide-react";
import { format } from "date-fns";
import type { FreeBusySlot, CalendarEvent } from "@/types";

interface AvailabilityViewProps {
  recipientId: string;
  selectedDate: Date | null;
  duration: number;
  onDataLoaded?: (myEvents: CalendarEvent[], recipientBusy: FreeBusySlot[]) => void;
}

const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 21;
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

function getBlockStyle(
  startTime: Date | string,
  endTime: Date | string,
  dayStart: Date
): { left: string; width: string } | null {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayStartMs + TOTAL_HOURS * 60 * 60 * 1000;

  const clampedStart = Math.max(start.getTime(), dayStartMs);
  const clampedEnd = Math.min(end.getTime(), dayEndMs);

  if (clampedStart >= clampedEnd) return null;

  const leftPct = ((clampedStart - dayStartMs) / (dayEndMs - dayStartMs)) * 100;
  const widthPct = ((clampedEnd - clampedStart) / (dayEndMs - dayStartMs)) * 100;

  return {
    left: `${leftPct}%`,
    width: `${Math.max(widthPct, 0.5)}%`,
  };
}

export function AvailabilityView({
  recipientId,
  selectedDate,
  duration,
  onDataLoaded,
}: AvailabilityViewProps) {
  const [myEvents, setMyEvents] = useState<CalendarEvent[]>([]);
  const [recipientBusy, setRecipientBusy] = useState<FreeBusySlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCalendar, setHasCalendar] = useState<boolean | null>(null);

  const fetchAvailability = useCallback(
    async (date: Date) => {
      setIsLoading(true);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      try {
        const [myRes, theirRes] = await Promise.all([
          fetch(
            `/api/calendar?mode=events&timeMin=${dayStart.toISOString()}&timeMax=${dayEnd.toISOString()}`
          ),
          fetch(
            `/api/calendar?mode=availability&targetUserId=${recipientId}&timeMin=${dayStart.toISOString()}&timeMax=${dayEnd.toISOString()}`
          ),
        ]);

        let loadedEvents: CalendarEvent[] = [];
        let loadedBusy: FreeBusySlot[] = [];

        if (myRes.ok) {
          const myData = await myRes.json();
          if (myData.success && Array.isArray(myData.data)) {
            loadedEvents = myData.data;
            setMyEvents(loadedEvents);
            setHasCalendar(true);
          } else if (myData.success && myData.data?.length === 0) {
            setMyEvents([]);
            setHasCalendar(true);
          } else {
            setHasCalendar(false);
          }
        }

        if (theirRes.ok) {
          const theirData = await theirRes.json();
          if (theirData.success) {
            loadedBusy = theirData.data?.busySlots || [];
            setRecipientBusy(loadedBusy);
          }
        }

        onDataLoaded?.(loadedEvents, loadedBusy);
      } catch {
        setHasCalendar(false);
      } finally {
        setIsLoading(false);
      }
    },
    [recipientId, onDataLoaded]
  );

  useEffect(() => {
    if (!selectedDate) return;
    fetchAvailability(selectedDate);
  }, [selectedDate, fetchAvailability]);

  if (!selectedDate) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
        <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
        <span className="text-sm text-white/60">Loading calendar availability...</span>
      </div>
    );
  }

  if (hasCalendar === false) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
        <LinkIcon className="h-4 w-4 text-white/40" />
        <span className="text-sm text-white/50">
          Connect your Google or Outlook calendar for availability insights
        </span>
      </div>
    );
  }

  const dayStart = new Date(selectedDate);
  dayStart.setHours(TIMELINE_START_HOUR, 0, 0, 0);

  const hourLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
    const hour = TIMELINE_START_HOUR + i;
    return hour <= 12 ? `${hour}${hour < 12 ? "a" : "p"}` : `${hour - 12}p`;
  });

  return (
    <div className="space-y-2 p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white/60 flex items-center gap-1">
          <Calendar className="h-3 w-3 text-cyan-400" />
          Availability for {format(selectedDate, "MMM d")}
        </span>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-cyan-500/60" />
            You
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-pink-500/60" />
            Them
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Hour labels */}
        <div className="flex justify-between text-[10px] text-white/30 mb-1 px-0">
          {hourLabels.map((label, i) => (
            <span key={i} className="w-0 text-center">
              {i % 2 === 0 ? label : ""}
            </span>
          ))}
        </div>

        {/* Timeline bar */}
        <div className="relative h-8 bg-white/5 rounded border border-white/10">
          {/* Hour grid lines */}
          {Array.from({ length: TOTAL_HOURS }, (_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-white/5"
              style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
            />
          ))}

          {/* My events (cyan) */}
          {myEvents.map((event, i) => {
            const style = getBlockStyle(event.startTime, event.endTime, dayStart);
            if (!style) return null;
            return (
              <div
                key={`my-${i}`}
                className="absolute top-0.5 h-[calc(50%-2px)] bg-cyan-500/40 rounded-sm border border-cyan-500/30"
                style={style}
                title={`${event.title} (${format(new Date(event.startTime), "h:mm a")} - ${format(new Date(event.endTime), "h:mm a")})`}
              />
            );
          })}

          {/* Recipient busy (pink) */}
          {recipientBusy.map((slot, i) => {
            const style = getBlockStyle(slot.startTime, slot.endTime, dayStart);
            if (!style) return null;
            return (
              <div
                key={`their-${i}`}
                className="absolute bottom-0.5 h-[calc(50%-2px)] bg-pink-500/40 rounded-sm border border-pink-500/30"
                style={style}
                title={`Busy (${format(new Date(slot.startTime), "h:mm a")} - ${format(new Date(slot.endTime), "h:mm a")})`}
              />
            );
          })}
        </div>
      </div>

      {myEvents.length === 0 && recipientBusy.length === 0 && (
        <p className="text-xs text-white/40 text-center">
          No busy slots found — looks like a great day to meet!
        </p>
      )}
    </div>
  );
}
