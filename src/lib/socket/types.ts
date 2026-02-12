import type { Server as SocketServer, Socket } from "socket.io";

// ============================================
// Socket Data (attached to each connection)
// ============================================

export interface SocketData {
  userId?: string;
  deviceId?: string;
  authenticated: boolean;
}

// ============================================
// Event Payloads
// ============================================

export interface MessageNewPayload {
  messageId: string;
  connectionId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface MessageSendPayload {
  connectionId?: string;
  targetUserId?: string;
  content: string;
}

export interface TypingPayload {
  connectionId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface PresencePayload {
  userId: string;
  userName?: string;
}

export interface SocketResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================
// Typed Socket.io Server & Socket
// ============================================

export interface ServerToClientEvents {
  "message:new": (data: MessageNewPayload) => void;
  "message:typing": (data: TypingPayload) => void;
  "notification:new": (data: NotificationPayload) => void;
  "presence:user_online": (data: PresencePayload) => void;
  "presence:user_offline": (data: PresencePayload) => void;
}

export interface ClientToServerEvents {
  "message:send": (
    data: MessageSendPayload,
    callback: (response: SocketResponse) => void
  ) => void;
  "message:typing": (data: TypingPayload) => void;
  "conversation:join": (connectionId: string) => void;
  "conversation:leave": (connectionId: string) => void;
}

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

export type AppSocketServer = SocketServer<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
