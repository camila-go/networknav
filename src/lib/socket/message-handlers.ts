import type {
  AppSocket,
  AppSocketServer,
  MessageSendPayload,
} from "./types";
import { connections, messages, users } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Message, Connection } from "@/types";
import { notifyNewMessage } from "@/lib/notifications/notification-service";

export function setupMessageHandlers(
  io: AppSocketServer,
  socket: AppSocket
) {
  // Join/leave conversation rooms
  socket.on("conversation:join", (connectionId: string) => {
    socket.join(`conversation:${connectionId}`);
  });

  socket.on("conversation:leave", (connectionId: string) => {
    socket.leave(`conversation:${connectionId}`);
  });

  // Handle message send
  socket.on("message:send", async (data: MessageSendPayload, callback) => {
    try {
      const userId = socket.data.userId || socket.data.deviceId;
      if (!userId) {
        return callback({ success: false, error: "Not authenticated" });
      }

      const { content } = data;
      if (!content?.trim()) {
        return callback({ success: false, error: "Message content required" });
      }

      let connectionId = data.connectionId;

      // For new conversations, find or create connection
      if (!connectionId && data.targetUserId) {
        connectionId = findOrCreateConnection(userId, data.targetUserId);
      }

      if (!connectionId) {
        return callback({ success: false, error: "Connection ID required" });
      }

      // Verify the user is part of this connection
      const connection = getConnection(connectionId);
      if (!connection) {
        return callback({ success: false, error: "Connection not found" });
      }

      if (
        connection.requesterId !== userId &&
        connection.recipientId !== userId
      ) {
        return callback({ success: false, error: "Not authorized" });
      }

      // Create message
      const message: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        connectionId,
        senderId: userId,
        content: content.trim(),
        read: false,
        createdAt: new Date(),
      };

      // Save to in-memory store
      const connMessages = messages.get(connectionId) || [];
      connMessages.push(message);
      messages.set(connectionId, connMessages);

      // Save to Supabase
      saveMessageToSupabase(message);

      // Get sender info
      const sender = users.get(userId);
      const senderName = sender?.name || "Unknown";

      // Broadcast to the conversation room
      io.to(`conversation:${connectionId}`).emit("message:new", {
        messageId: message.id,
        connectionId,
        senderId: userId,
        senderName,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      });

      // Send notification to recipient
      const recipientId =
        connection.requesterId === userId
          ? connection.recipientId
          : connection.requesterId;

      notifyNewMessage(recipientId, senderName, content);

      callback({
        success: true,
        data: {
          message: {
            id: message.id,
            connectionId,
            senderId: message.senderId,
            content: message.content,
            read: message.read,
            createdAt: message.createdAt.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error("[Socket.io] Message send error:", error);
      callback({ success: false, error: "Failed to send message" });
    }
  });

  // Handle typing indicators
  socket.on("message:typing", (data) => {
    const userId = socket.data.userId || socket.data.deviceId;
    if (!userId || !data.connectionId) return;

    const user = users.get(userId);
    socket.to(`conversation:${data.connectionId}`).emit("message:typing", {
      connectionId: data.connectionId,
      userId,
      userName: user?.name || "Someone",
      isTyping: data.isTyping,
    });
  });
}

// ============================================
// Helpers
// ============================================

function getConnection(connectionId: string): Connection | null {
  return connections.get(connectionId) || null;
}

function findOrCreateConnection(
  userId: string,
  targetUserId: string
): string | null {
  // Check existing connections
  for (const [id, conn] of connections.entries()) {
    if (
      (conn.requesterId === userId && conn.recipientId === targetUserId) ||
      (conn.requesterId === targetUserId && conn.recipientId === userId)
    ) {
      return id;
    }
  }

  // Create new auto-accepted connection
  const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const connection: Connection = {
    id,
    requesterId: userId,
    recipientId: targetUserId,
    status: "accepted",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  connections.set(id, connection);
  return id;
}

async function saveMessageToSupabase(message: Message): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  try {
    await supabaseAdmin.from("messages").insert({
      id: message.id,
      connection_id: message.connectionId,
      sender_id: message.senderId,
      content: message.content,
      read: message.read,
      created_at: message.createdAt.toISOString(),
    } as never);
  } catch (error) {
    console.error("[Socket.io] Supabase message save error:", error);
  }
}
