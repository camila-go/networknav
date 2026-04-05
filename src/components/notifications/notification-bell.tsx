"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationList } from "./notification-list";
import { useSocket } from "@/lib/socket/client";
import { cn } from "@/lib/utils";
import { SHOW_GAMIFICATION_UI } from "@/lib/feature-flags";
import { isGamificationNotificationType } from "@/lib/notifications/presentation-filter";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { socket, isConnected } = useSocket();

  // Fetch initial count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Listen for real-time notifications via Socket.io
  useEffect(() => {
    if (!socket) return;

    function handleNewNotification(payload?: { type?: string }) {
      if (
        !SHOW_GAMIFICATION_UI &&
        payload?.type &&
        isGamificationNotificationType(payload.type)
      ) {
        return;
      }
      setUnreadCount((prev) => prev + 1);
    }

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket]);

  // Fallback polling only when Socket.io is disconnected
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isConnected]);

  async function fetchUnreadCount() {
    try {
      const response = await fetch("/api/notifications?type=count");
      const result = await response.json();
      if (result.success) {
        setUnreadCount(result.data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
    }
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (!open) {
      fetchUnreadCount();
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/70 hover:text-white hover:bg-white/10 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:stroke-2"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                "min-w-[18px] h-[18px] rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black text-xs font-bold",
                "animate-pulse-soft"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-transparent border-0"
        align="end"
        sideOffset={8}
      >
        <NotificationList onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
