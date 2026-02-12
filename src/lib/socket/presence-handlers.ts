import type { AppSocket, AppSocketServer } from "./types";
import { users } from "@/lib/stores";

// Track online users: userId → Set of socketIds (supports multiple tabs)
const onlineUsers = new Map<string, Set<string>>();

export function setupPresenceHandlers(
  io: AppSocketServer,
  socket: AppSocket
) {
  const userId = socket.data.userId || socket.data.deviceId;

  // Mark user as online on connect
  if (userId) {
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());

      const user = users.get(userId);
      io.emit("presence:user_online", {
        userId,
        userName: user?.name,
      });
    }
    onlineUsers.get(userId)!.add(socket.id);
  }

  // Handle disconnect
  socket.on("disconnect", () => {
    if (!userId) return;

    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);

      // Only broadcast offline if no more tabs/sockets
      if (sockets.size === 0) {
        onlineUsers.delete(userId);

        const user = users.get(userId);
        io.emit("presence:user_offline", {
          userId,
          userName: user?.name,
        });
      }
    }
  });
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys());
}
