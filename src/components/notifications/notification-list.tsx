"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Loader2, Users, MessageCircle, Sparkles, AlertCircle, Calendar, CalendarCheck, CalendarX, Trophy, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { useSocket } from "@/lib/socket/client";
import type { NotificationPayload } from "@/lib/socket/types";
import type { Notification, NotificationType } from "@/types";

interface NotificationListProps {
  onClose?: () => void;
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  new_matches: <Sparkles className="h-4 w-4 text-fuchsia-400" />,
  connection_request: <Users className="h-4 w-4 text-teal-400" />,
  connection_accepted: <Check className="h-4 w-4 text-green-400" />,
  meeting_request: <Calendar className="h-4 w-4 text-cyan-400" />,
  meeting_accepted: <CalendarCheck className="h-4 w-4 text-green-400" />,
  meeting_declined: <CalendarX className="h-4 w-4 text-red-400" />,
  new_message: <MessageCircle className="h-4 w-4 text-blue-400" />,
  request_reminder: <AlertCircle className="h-4 w-4 text-amber-400" />,
  questionnaire_reminder: <Bell className="h-4 w-4 text-orange-400" />,
  badge_earned: <Trophy className="h-4 w-4 text-amber-400" />,
  profile_frame_unlocked: <UserCircle className="h-4 w-4 text-cyan-400" />,
};

export function NotificationList({ onClose }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Prepend real-time notifications
  useEffect(() => {
    if (!socket) return;

    function handleNewNotification(data: NotificationPayload) {
      setNotifications((prev) => [
        {
          id: data.id,
          userId: data.userId,
          type: data.type as NotificationType,
          title: data.title,
          body: data.body,
          read: false,
          createdAt: new Date(data.createdAt),
        },
        ...prev,
      ]);
    }

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket]);

  async function fetchNotifications() {
    try {
      const response = await fetch("/api/notifications");
      const result = await response.json();
      if (result.success) {
        setNotifications(result.data.notifications);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markAllRead" }),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  }

  async function handleMarkRead(notificationId: string) {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  }

  async function handleDelete(notificationId: string) {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col max-h-[400px] bg-[#0a1628] border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-semibold text-white">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:bg-white/5"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-white/40" />
            </div>
            <p className="text-sm text-white/50">
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  const icon = NOTIFICATION_ICONS[notification.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 hover:bg-white/5 transition-colors group",
        !notification.read && "bg-cyan-500/5"
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            notification.read ? "text-white/70" : "text-white font-medium"
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-white/40 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onMarkRead(notification.id)}
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white/60 hover:text-red-400 hover:bg-white/10"
          onClick={() => onDelete(notification.id)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
      )}
    </div>
  );
}

