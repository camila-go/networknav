"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Video,
  Coffee,
  Users,
  Phone,
  Calendar,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { PublicUser, MeetingType, Commonality } from "@/types";

interface MeetingRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: PublicUser;
  commonalities?: Commonality[];
  conversationStarters?: string[];
  onSuccess?: () => void;
}

const MEETING_TYPES: { value: MeetingType; label: string; icon: typeof Video; description: string }[] = [
  { value: "video", label: "Video Call", icon: Video, description: "Teams or Google Meet" },
  { value: "coffee", label: "Coffee/Meal", icon: Coffee, description: "In person at conference" },
  { value: "conference", label: "Conference Meetup", icon: Users, description: "Meet at the event" },
  { value: "phone", label: "Phone Call", icon: Phone, description: "Quick voice call" },
];

const DURATION_OPTIONS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "1 hour" },
];

export function MeetingRequestModal({
  open,
  onOpenChange,
  recipient,
  commonalities = [],
  conversationStarters = [],
  onSuccess,
}: MeetingRequestModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [meetingType, setMeetingType] = useState<MeetingType>("video");
  const [duration, setDuration] = useState("30");
  const [contextMessage, setContextMessage] = useState("");
  const [proposedTimes, setProposedTimes] = useState<string[]>(["", "", ""]);

  const initials = recipient.profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  // Generate default time slots (next 3 business days)
  function generateDefaultTimes() {
    const times: string[] = [];
    const now = new Date();
    for (let i = 1; i <= 3; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      // Skip weekends
      if (date.getDay() === 0) date.setDate(date.getDate() + 1);
      if (date.getDay() === 6) date.setDate(date.getDate() + 2);
      // Set to 10 AM
      date.setHours(10, 0, 0, 0);
      times.push(date.toISOString().slice(0, 16));
    }
    return times;
  }

  function handleTimeChange(index: number, value: string) {
    const newTimes = [...proposedTimes];
    newTimes[index] = value;
    setProposedTimes(newTimes);
  }

  function addSuggestedTopic(topic: string) {
    if (contextMessage) {
      setContextMessage(contextMessage + "\n\n" + topic);
    } else {
      setContextMessage(topic);
    }
  }

  async function handleSubmit() {
    // Validate at least one time is proposed
    const validTimes = proposedTimes.filter(t => t !== "");
    if (validTimes.length === 0) {
      toast({
        variant: "destructive",
        title: "Please propose at least one time",
        description: "Select when you'd like to meet",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipient.id,
          duration: parseInt(duration),
          meetingType,
          contextMessage: contextMessage.trim() || undefined,
          proposedTimes: validTimes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: "Meeting request sent!",
          description: `${recipient.profile.name} will receive your request.`,
        });
        onOpenChange(false);
        onSuccess?.();
        // Reset form
        setMeetingType("video");
        setDuration("30");
        setContextMessage("");
        setProposedTimes(["", "", ""]);
      } else {
        toast({
          variant: "destructive",
          title: "Failed to send request",
          description: result.error || "Please try again",
        });
      }
    } catch (error) {
      console.error("Meeting request error:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again later",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipient.profile.photoUrl} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="block">Request Meeting with</span>
              <span className="text-primary">{recipient.profile.name}</span>
            </div>
          </DialogTitle>
          <DialogDescription>
            {recipient.profile.position}
            {recipient.profile.company && ` at ${recipient.profile.company}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meeting Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Meeting Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {MEETING_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setMeetingType(type.value)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                    meetingType === type.value
                      ? "border-primary bg-primary/5"
                      : "border-navy-100 hover:border-navy-200"
                  )}
                >
                  <type.icon className={cn(
                    "h-5 w-5",
                    meetingType === type.value ? "text-primary" : "text-navy-400"
                  )} />
                  <div>
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Proposed Times */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Propose Times</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setProposedTimes(generateDefaultTimes())}
                className="text-xs text-primary"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Suggest times
              </Button>
            </div>
            <div className="space-y-2">
              {proposedTimes.map((time, index) => (
                <Input
                  key={index}
                  type="datetime-local"
                  value={time}
                  onChange={(e) => handleTimeChange(index, e.target.value)}
                  className="text-sm"
                  placeholder={`Option ${index + 1}`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Propose up to 3 times. {recipient.profile.name.split(" ")[0]} will choose one.
            </p>
          </div>

          {/* Context Message */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Add context <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <textarea
              value={contextMessage}
              onChange={(e) => setContextMessage(e.target.value)}
              placeholder={`What would you like to discuss with ${recipient.profile.name.split(" ")[0]}?`}
              className="w-full min-h-[80px] p-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={500}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{contextMessage.length} / 500</span>
            </div>

            {/* Suggested topics from commonalities */}
            {conversationStarters.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Suggested topics
                </p>
                <div className="flex flex-wrap gap-2">
                  {conversationStarters.slice(0, 3).map((starter, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary"
                      onClick={() => addSuggestedTopic(starter)}
                    >
                      {starter.length > 50 ? starter.slice(0, 50) + "..." : starter}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Commonalities preview */}
          {commonalities.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-2">
                Why you're connecting
              </p>
              <ul className="space-y-1">
                {commonalities.slice(0, 3).map((c, index) => (
                  <li key={index} className="text-sm text-navy-700 flex items-center gap-2">
                    <span className="text-primary">•</span>
                    {c.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

