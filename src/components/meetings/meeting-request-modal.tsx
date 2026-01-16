"use client";

import { useState, useEffect, useCallback } from "react";
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
  PartyPopper,
  Rocket,
  CheckCircle2,
  X,
} from "lucide-react";
import type { PublicUser, MeetingType, Commonality } from "@/types";

// Confetti particle component
function ConfettiParticle({ delay, color }: { delay: number; color: string }) {
  return (
    <div
      className="absolute w-3 h-3 animate-confetti"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${delay}ms`,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
    />
  );
}

// Success celebration overlay
function SuccessCelebration({ recipientName, onClose }: { recipientName: string; onClose: () => void }) {
  const colors = ['#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f87171'];
  const [particles] = useState(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      delay: Math.random() * 500,
      color: colors[Math.floor(Math.random() * colors.length)],
    }))
  );

  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <ConfettiParticle key={p.id} delay={p.delay} color={p.color} />
        ))}
      </div>
      
      {/* Success card */}
      <div className="relative bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-3xl p-8 mx-4 max-w-sm text-center animate-scale-bounce shadow-2xl">
        <div className="absolute -top-6 left-1/2 -translate-x-1/2">
          <div className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 rounded-full p-4 animate-pulse-soft">
            <PartyPopper className="h-8 w-8 text-white" />
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex justify-center gap-2">
            <Rocket className="h-6 w-6 text-fuchsia-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <Sparkles className="h-6 w-6 text-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <CheckCircle2 className="h-6 w-6 text-green-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          
          <h3 className="text-2xl font-bold text-white">
            Request Sent! 🎉
          </h3>
          
          <p className="text-white/70">
            <span className="text-cyan-400 font-semibold">{recipientName}</span> will receive your meeting request and can respond with their availability.
          </p>
          
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/60 text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Notification sent
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [showCelebration, setShowCelebration] = useState(false);
  const [meetingType, setMeetingType] = useState<MeetingType>("video");
  const [duration, setDuration] = useState("30");
  const [contextMessage, setContextMessage] = useState("");
  const [proposedTimes, setProposedTimes] = useState<string[]>(["", "", ""]);

  const handleCelebrationClose = useCallback(() => {
    setShowCelebration(false);
    onOpenChange(false);
    onSuccess?.();
  }, [onOpenChange, onSuccess]);

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
        // Show celebration animation!
        setShowCelebration(true);
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
    <>
      {/* Celebration overlay */}
      {showCelebration && (
        <SuccessCelebration 
          recipientName={recipient.profile.name.split(' ')[0]} 
          onClose={handleCelebrationClose} 
        />
      )}
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <Avatar className="h-10 w-10 border-2 border-white/20">
              <AvatarImage src={recipient.profile.photoUrl} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="block text-white">Request Meeting with</span>
              <span className="text-cyan-400">{recipient.profile.name}</span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {recipient.profile.position}
            {recipient.profile.company && ` at ${recipient.profile.company}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meeting Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">Meeting Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {MEETING_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setMeetingType(type.value)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all",
                    meetingType === type.value
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-white/20 hover:border-white/40 bg-white/5"
                  )}
                >
                  <type.icon className={cn(
                    "h-5 w-5",
                    meetingType === type.value ? "text-cyan-400" : "text-white/50"
                  )} />
                  <div>
                    <p className={cn("font-medium text-sm", meetingType === type.value ? "text-white" : "text-white/80")}>{type.label}</p>
                    <p className="text-xs text-white/50">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-cyan-500 focus:ring-cyan-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-cyan-500/20 focus:text-cyan-400">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-white/50" />
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
              <Label className="text-sm font-medium text-white">Propose Times</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setProposedTimes(generateDefaultTimes())}
                className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Suggest times
              </Button>
            </div>
            <div className="space-y-2">
              {proposedTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="datetime-local"
                      value={time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      className="w-full h-10 px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                  {time && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTimeChange(index, "")}
                      className="h-10 w-10 text-white/40 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      title="Clear time"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/50">
              Propose up to 3 times. {recipient.profile.name.split(" ")[0]} will choose one.
            </p>
          </div>

          {/* Context Message */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white">
              Add context <span className="text-white/50 font-normal">(optional)</span>
            </Label>
            <textarea
              value={contextMessage}
              onChange={(e) => setContextMessage(e.target.value)}
              placeholder={`What would you like to discuss with ${recipient.profile.name.split(" ")[0]}?`}
              className="w-full min-h-[80px] p-3 rounded-lg border border-white/20 bg-white/5 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 placeholder:text-white/40"
              maxLength={500}
            />
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>{contextMessage.length} / 500</span>
            </div>

            {/* Suggested topics from commonalities */}
            {conversationStarters.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-white/50 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  Suggested topics
                </p>
                <div className="flex flex-wrap gap-2">
                  {conversationStarters.slice(0, 3).map((starter, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer border-white/20 text-white/80 hover:bg-cyan-500/10 hover:border-cyan-500 hover:text-cyan-400"
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
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <p className="text-xs font-medium text-cyan-400 mb-2">
                Why you're connecting
              </p>
              <ul className="space-y-1">
                {commonalities.slice(0, 3).map((c, index) => (
                  <li key={index} className="text-sm text-white/80 flex items-center gap-2">
                    <span className="text-cyan-400">•</span>
                    {c.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400"
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
    </>
  );
}

