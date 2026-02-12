"use client";

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  Video,
  Coffee,
  Users,
  Phone,
  Check,
  X,
  CalendarClock,
  Loader2,
  ExternalLink,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, formatDistanceToNow, isFuture, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import type { MeetingWithUsers, MeetingType, CalendarEvent } from "@/types";
import Link from "next/link";

const MEETING_TYPE_ICONS: Record<MeetingType, typeof Video> = {
  video: Video,
  coffee: Coffee,
  conference: Users,
  phone: Phone,
};

export function MeetingsContainer() {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<MeetingWithUsers[]>([]);
  const [allMeetings, setAllMeetings] = useState<MeetingWithUsers[]>([]);
  const [stats, setStats] = useState({ pending: 0, upcoming: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  // Default to "requests" tab since new meetings start as pending
  const [activeTab, setActiveTab] = useState("requests");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showExternalCalendar, setShowExternalCalendar] = useState(false);
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [activeTab]);

  useEffect(() => {
    fetchAllMeetings();
  }, []);

  useEffect(() => {
    if (!showExternalCalendar) {
      setExternalEvents([]);
      return;
    }
    async function fetchExternalEvents() {
      setExternalLoading(true);
      try {
        const monthStart = startOfMonth(calendarDate);
        const monthEnd = endOfMonth(calendarDate);
        const res = await fetch(
          `/api/calendar?mode=events&timeMin=${monthStart.toISOString()}&timeMax=${monthEnd.toISOString()}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setExternalEvents(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch external calendar:", error);
      } finally {
        setExternalLoading(false);
      }
    }
    fetchExternalEvents();
  }, [showExternalCalendar, calendarDate]);

  async function fetchMeetings() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/meetings?filter=${activeTab}`);
      const result = await response.json();

      if (result.success) {
        setMeetings(result.data.meetings);
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAllMeetings() {
    try {
      const response = await fetch(`/api/meetings?filter=all`);
      const result = await response.json();

      if (result.success) {
        setAllMeetings(result.data.meetings);
      }
    } catch (error) {
      console.error("Failed to fetch all meetings:", error);
    }
  }

  // Calendar helper functions
  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    return eachDayOfInterval({ start, end });
  }, [calendarDate]);

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, MeetingWithUsers[]>();
    allMeetings.forEach(meeting => {
      if (meeting.acceptedTime) {
        const dateKey = format(new Date(meeting.acceptedTime), "yyyy-MM-dd");
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, meeting]);
      }
    });
    return map;
  }, [allMeetings]);

  const externalEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    externalEvents.forEach(event => {
      const dateKey = format(new Date(event.startTime), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      map.set(dateKey, [...existing, event]);
    });
    return map;
  }, [externalEvents]);

  async function handleMeetingAction(meetingId: string, action: string, data?: object) {
    setActionLoading(meetingId);
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: result.data.message,
        });
        fetchMeetings();
      } else {
        toast({
          variant: "destructive",
          title: "Action failed",
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Meeting action error:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
      });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">My Meetings</h1>
          <p className="text-white/60">
            Manage your scheduled meetings and requests
          </p>
        </div>
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn(
              "h-8 px-3 transition-colors",
              viewMode === "list" 
                ? "bg-cyan-500/20 text-cyan-400" 
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("calendar")}
            className={cn(
              "h-8 px-3 transition-colors",
              viewMode === "calendar" 
                ? "bg-cyan-500/20 text-cyan-400" 
                : "text-white/50 hover:text-white hover:bg-white/5"
            )}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Upcoming"
          value={stats.upcoming}
          color="text-cyan-400"
          bgColor="bg-cyan-500/20"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending"
          value={stats.pending}
          color="text-amber-400"
          bgColor="bg-amber-500/20"
        />
        <StatCard
          icon={<Check className="h-5 w-5" />}
          label="Completed"
          value={stats.completed}
          color="text-teal-400"
          bgColor="bg-teal-500/20"
        />
      </div>

      {/* Calendar View */}
      {viewMode === "calendar" ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {format(calendarDate, "MMMM yyyy")}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExternalCalendar(!showExternalCalendar)}
                className={cn(
                  "text-xs gap-1 transition-colors",
                  showExternalCalendar
                    ? "text-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <Calendar className="h-3 w-3" />
                {externalLoading ? "Loading..." : "My Calendar"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCalendarDate(new Date())}
                className="text-cyan-400 hover:bg-cyan-500/10"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-xs text-white/50 py-2 font-medium">
                {day}
              </div>
            ))}
            
            {/* Empty cells for start of month */}
            {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {/* Calendar days */}
            {calendarDays.map(day => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayMeetings = meetingsByDate.get(dateKey) || [];
              const dayExternalEvents = showExternalCalendar ? (externalEventsByDate.get(dateKey) || []) : [];
              const isToday = isSameDay(day, new Date());
              const hasScheduledMeetings = dayMeetings.some(m => m.status === "scheduled");
              const hasExternalEvents = dayExternalEvents.length > 0;

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "aspect-square p-1 rounded-lg relative transition-colors",
                    isToday && "bg-cyan-500/20 border border-cyan-500/50",
                    !isToday && (hasScheduledMeetings || hasExternalEvents) && "bg-white/5 hover:bg-white/10",
                    !isToday && !hasScheduledMeetings && !hasExternalEvents && "hover:bg-white/5"
                  )}
                >
                  <span className={cn(
                    "text-sm",
                    isToday ? "text-cyan-400 font-semibold" : "text-white/70"
                  )}>
                    {format(day, "d")}
                  </span>

                  {/* Meeting + external event indicators */}
                  {(dayMeetings.length > 0 || hasExternalEvents) && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayMeetings.slice(0, 3).map((meeting) => (
                        <div
                          key={meeting.id}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            meeting.status === "scheduled" && "bg-cyan-400",
                            meeting.status === "pending" && "bg-amber-400",
                            meeting.status === "completed" && "bg-teal-400"
                          )}
                          title={`${meeting.requester.profile.name} - ${meeting.meetingType}`}
                        />
                      ))}
                      {hasExternalEvents && (
                        <div
                          className="w-1.5 h-1.5 rounded-full bg-purple-400"
                          title={`${dayExternalEvents.length} calendar event${dayExternalEvents.length > 1 ? "s" : ""}`}
                        />
                      )}
                      {dayMeetings.length > 3 && (
                        <span className="text-[10px] text-white/50">+{dayMeetings.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10 text-xs text-white/50">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Completed</span>
            </div>
            {showExternalCalendar && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Calendar</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* List View - Tabs */
        <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
          <TabsTrigger 
            value="upcoming" 
            className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-white/70"
          >
            Upcoming
            {stats.upcoming > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] bg-cyan-500/20 text-cyan-400">
                {stats.upcoming}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="requests" 
            className="gap-2 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-white/70"
          >
            Requests
            {stats.pending > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] bg-amber-500/20 text-amber-400">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="past"
            className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-white/70"
          >
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {isLoading ? (
            <LoadingState />
          ) : meetings.length === 0 ? (
            <EmptyState
              title="No upcoming meetings"
              description="When you schedule meetings, they'll appear here."
              action={
                <Link href="/explore">
                  <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400">
                    Find people to meet
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <UpcomingMeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onAction={handleMeetingAction}
                  isLoading={actionLoading === meeting.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          {isLoading ? (
            <LoadingState />
          ) : meetings.length === 0 ? (
            <EmptyState
              title="No pending requests"
              description="Meeting requests you send or receive will appear here."
            />
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <RequestCard
                  key={meeting.id}
                  meeting={meeting}
                  onAction={handleMeetingAction}
                  isLoading={actionLoading === meeting.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {isLoading ? (
            <LoadingState />
          ) : meetings.length === 0 ? (
            <EmptyState
              title="No past meetings"
              description="Your completed meetings will appear here."
            />
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <PastMeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
      <div className={cn("p-2 rounded-lg", bgColor, color)}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-white/60">{label}</p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 mb-4">{description}</p>
      {action}
    </div>
  );
}

function UpcomingMeetingCard({
  meeting,
  onAction,
  isLoading,
}: {
  meeting: MeetingWithUsers;
  onAction: (id: string, action: string) => void;
  isLoading: boolean;
}) {
  const otherPerson = meeting.requester.id === meeting.recipientId
    ? meeting.requester
    : meeting.recipient;

  const initials = otherPerson.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const MeetingIcon = MEETING_TYPE_ICONS[meeting.meetingType];
  const meetingTime = meeting.acceptedTime ? new Date(meeting.acceptedTime) : null;
  const isStartingSoon = meetingTime && isFuture(meetingTime) && 
    (meetingTime.getTime() - Date.now()) < 15 * 60 * 1000;

  return (
    <div className={cn(
      "rounded-xl bg-white/5 border border-white/10 p-4",
      isStartingSoon && "border-cyan-500/50 bg-cyan-500/5"
    )}>
      <div className="flex items-start gap-4">
        <Link href={`/user/${otherPerson.id}`}>
          <Avatar className="h-12 w-12 border-2 border-white/20">
            <AvatarImage src={otherPerson.profile.photoUrl} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link href={`/user/${otherPerson.id}`}>
                <h3 className="font-semibold text-white hover:text-cyan-400 transition-colors">
                  {otherPerson.profile.name}
                </h3>
              </Link>
              <p className="text-sm text-white/60">
                {otherPerson.profile.position}
              </p>
            </div>
            {isStartingSoon && (
              <Badge className="bg-cyan-500 text-black">Starting Soon</Badge>
            )}
          </div>

          {meetingTime && (
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1.5 text-white/80">
                <Calendar className="h-4 w-4 text-cyan-400" />
                {format(meetingTime, "EEE, MMM d")}
              </div>
              <div className="flex items-center gap-1.5 text-white/80">
                <Clock className="h-4 w-4 text-cyan-400" />
                {format(meetingTime, "h:mm a")}
              </div>
              <div className="flex items-center gap-1.5 text-white/80">
                <MeetingIcon className="h-4 w-4 text-cyan-400" />
                {meeting.duration} min
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            {meeting.meetingLink && (
              <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400" asChild>
                <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                  <Video className="h-4 w-4 mr-1" />
                  Join Meeting
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(meeting.id, "cancel")}
              disabled={isLoading}
              className="border-white/20 text-white hover:bg-white/10"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestCard({
  meeting,
  onAction,
  isLoading,
}: {
  meeting: MeetingWithUsers;
  onAction: (id: string, action: string, data?: object) => void;
  isLoading: boolean;
}) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const otherPerson = meeting.requester;
  const isRecipient = true;

  const initials = otherPerson.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const MeetingIcon = MEETING_TYPE_ICONS[meeting.meetingType];

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-start gap-4">
        <Link href={`/user/${otherPerson.id}`}>
          <Avatar className="h-12 w-12 border-2 border-white/20">
            <AvatarImage src={otherPerson.profile.photoUrl} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link href={`/user/${otherPerson.id}`}>
                <h3 className="font-semibold text-white hover:text-cyan-400 transition-colors">
                  {otherPerson.profile.name}
                </h3>
              </Link>
              <p className="text-sm text-white/60">
                {otherPerson.profile.position}
              </p>
            </div>
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10">
              Pending
            </Badge>
          </div>

          {meeting.contextMessage && (
            <p className="mt-2 text-sm text-white/80 bg-white/5 p-2 rounded-lg border border-white/10">
              "{meeting.contextMessage}"
            </p>
          )}

          <div className="flex items-center gap-3 mt-3 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <MeetingIcon className="h-4 w-4" />
              {meeting.meetingType}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {meeting.duration} min
            </span>
            <span>
              Sent {formatDistanceToNow(new Date(meeting.createdAt))} ago
            </span>
          </div>

          {isRecipient && meeting.proposedTimes.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-white/50">Select a time:</p>
              <div className="flex flex-wrap gap-2">
                {meeting.proposedTimes.map((time, index) => {
                  const timeDate = new Date(time);
                  const isSelected = selectedTime === time.toString();
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedTime(time.toString())}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm transition-all",
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/20 text-cyan-400"
                          : "border-white/20 text-white/70 hover:border-cyan-500/50"
                      )}
                    >
                      {format(timeDate, "EEE, MMM d")} at {format(timeDate, "h:mm a")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isRecipient && (
            <div className="flex items-center gap-2 mt-4">
              <Button
                size="sm"
                onClick={() => onAction(meeting.id, "accept", { acceptedTime: selectedTime })}
                disabled={isLoading || !selectedTime}
                className="gap-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction(meeting.id, "decline")}
                disabled={isLoading}
                className="gap-1 border-white/20 text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PastMeetingCard({ meeting }: { meeting: MeetingWithUsers }) {
  const otherPerson = meeting.requester;
  const initials = otherPerson.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const MeetingIcon = MEETING_TYPE_ICONS[meeting.meetingType];
  const meetingTime = meeting.acceptedTime ? new Date(meeting.acceptedTime) : null;

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 opacity-75">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10 border-2 border-white/20">
          <AvatarImage src={otherPerson.profile.photoUrl} />
          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white">{otherPerson.profile.name}</h3>
          <div className="flex items-center gap-3 text-sm text-white/50">
            {meetingTime && (
              <span>{format(meetingTime, "MMM d, yyyy")}</span>
            )}
            <span className="flex items-center gap-1">
              <MeetingIcon className="h-3 w-3" />
              {meeting.duration} min
            </span>
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn(
            meeting.status === "completed" && "text-teal-400 border-teal-500/30 bg-teal-500/10",
            meeting.status === "cancelled" && "text-red-400 border-red-500/30 bg-red-500/10",
            meeting.status === "declined" && "text-white/50 border-white/20 bg-white/5"
          )}
        >
          {meeting.status}
        </Badge>
      </div>
    </div>
  );
}
