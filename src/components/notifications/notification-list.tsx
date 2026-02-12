"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Loader2, Users, MessageCircle, Sparkles, AlertCircle, Calendar, CalendarCheck, CalendarX } from "lucide-react";
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
  new_matches: <Sparkles className="h-4 w-4 text-primary" />,
  connection_request: <Users className="h-4 w-4 text-teal-500" />,
  connection_accepted: <Check className="h-4 w-4 text-green-500" />,
  meeting_request: <Calendar className="h-4 w-4 text-cyan-500" />,
  meeting_accepted: <CalendarCheck className="h-4 w-4 text-green-500" />,
  meeting_declined: <CalendarX className="h-4 w-4 text-red-500" />,
  new_message: <MessageCircle className="h-4 w-4 text-blue-500" />,
  request_reminder: <AlertCircle className="h-4 w-4 text-amber-500" />,
  questionnaire_reminder: <Bell className="h-4 w-4 text-coral-500" />,
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
    <div className="flex flex-col max-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-navy-900">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs text-primary"
          >
            Mark all read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-navy-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              No notifications yet
            </p>
          </div>
        ) : (
          <div className="divide-y">
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
        "flex items-start gap-3 p-4 hover:bg-navy-50 transition-colors group",
        !notification.read && "bg-primary/5"
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border flex items-center justify-center">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm",
            notification.read ? "text-navy-600" : "text-navy-900 font-medium"
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onMarkRead(notification.id)}
            title="Mark as read"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(notification.id)}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      )}
    </div>
  );
}

