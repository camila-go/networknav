"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import type { MeetingWithUsers, MeetingType } from "@/types";
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
  const [stats, setStats] = useState({ pending: 0, upcoming: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchMeetings();
  }, [activeTab]);

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
      <div>
        <h1 className="text-2xl font-bold text-navy-900 font-display">My Meetings</h1>
        <p className="text-muted-foreground">
          Manage your scheduled meetings and requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Upcoming"
          value={stats.upcoming}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending"
          value={stats.pending}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={<Check className="h-5 w-5" />}
          label="Completed"
          value={stats.completed}
          color="text-teal-600"
          bgColor="bg-teal-50"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="gap-2">
            Upcoming
            {stats.upcoming > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] bg-primary/10 text-primary">
                {stats.upcoming}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            Requests
            {stats.pending > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] bg-amber-100 text-amber-700">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
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
                  <Button>Find people to meet</Button>
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
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", bgColor, color)}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-navy-900">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      <Calendar className="h-12 w-12 text-navy-200 mx-auto mb-4" />
      <h3 className="font-semibold text-navy-900 mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4">{description}</p>
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
  // Determine the other person (not current user)
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
    (meetingTime.getTime() - Date.now()) < 15 * 60 * 1000; // 15 minutes

  return (
    <Card className={cn(isStartingSoon && "border-primary/50 bg-primary/5")}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Link href={`/user/${otherPerson.id}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherPerson.profile.photoUrl} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/user/${otherPerson.id}`}>
                  <h3 className="font-semibold text-navy-900 hover:text-primary">
                    {otherPerson.profile.name}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground">
                  {otherPerson.profile.position}
                </p>
              </div>
              {isStartingSoon && (
                <Badge className="bg-primary text-white">Starting Soon</Badge>
              )}
            </div>

            {meetingTime && (
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5 text-navy-700">
                  <Calendar className="h-4 w-4 text-primary" />
                  {format(meetingTime, "EEE, MMM d")}
                </div>
                <div className="flex items-center gap-1.5 text-navy-700">
                  <Clock className="h-4 w-4 text-primary" />
                  {format(meetingTime, "h:mm a")}
                </div>
                <div className="flex items-center gap-1.5 text-navy-700">
                  <MeetingIcon className="h-4 w-4 text-primary" />
                  {meeting.duration} min
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              {meeting.meetingLink && (
                <Button size="sm" asChild>
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
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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

  // Determine if current user is the recipient (needs to respond)
  // For demo, we'll show response options for all pending requests
  const otherPerson = meeting.requester;
  const isRecipient = true; // In production, compare with currentUserId

  const initials = otherPerson.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const MeetingIcon = MEETING_TYPE_ICONS[meeting.meetingType];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Link href={`/user/${otherPerson.id}`}>
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherPerson.profile.photoUrl} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/user/${otherPerson.id}`}>
                  <h3 className="font-semibold text-navy-900 hover:text-primary">
                    {otherPerson.profile.name}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground">
                  {otherPerson.profile.position}
                </p>
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                Pending
              </Badge>
            </div>

            {meeting.contextMessage && (
              <p className="mt-2 text-sm text-navy-700 bg-navy-50 p-2 rounded-lg">
                "{meeting.contextMessage}"
              </p>
            )}

            <div className="flex items-center gap-3 mt-3 text-sm text-navy-600">
              <span className="flex items-center gap-1">
                <MeetingIcon className="h-4 w-4" />
                {meeting.meetingType}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {meeting.duration} min
              </span>
              <span className="text-muted-foreground">
                Sent {formatDistanceToNow(new Date(meeting.createdAt))} ago
              </span>
            </div>

            {/* Proposed times */}
            {isRecipient && meeting.proposedTimes.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Select a time:</p>
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
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-navy-200 hover:border-primary/50"
                        )}
                      >
                        {format(timeDate, "EEE, MMM d")} at {format(timeDate, "h:mm a")}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            {isRecipient && (
              <div className="flex items-center gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => onAction(meeting.id, "accept", { acceptedTime: selectedTime })}
                  disabled={isLoading || !selectedTime}
                  className="gap-1"
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
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Decline
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card className="opacity-75">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherPerson.profile.photoUrl} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-navy-900">{otherPerson.profile.name}</h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
              meeting.status === "completed" && "text-teal-600 border-teal-200 bg-teal-50",
              meeting.status === "cancelled" && "text-red-600 border-red-200 bg-red-50",
              meeting.status === "declined" && "text-navy-500 border-navy-200 bg-navy-50"
            )}
          >
            {meeting.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

