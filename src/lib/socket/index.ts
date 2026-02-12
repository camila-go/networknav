import type { AppSocketServer } from "./types";
import { authenticateSocket } from "./auth-middleware";
import { setupMessageHandlers } from "./message-handlers";
import { setupPresenceHandlers } from "./presence-handlers";

// Singleton for accessing Socket.io from API routes / services
let ioInstance: AppSocketServer | null = null;

export function setupSocketHandlers(io: AppSocketServer) {
  ioInstance = io;

  // Authenticate all connections via JWT cookie
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId =
      socket.data.userId || socket.data.deviceId || "anonymous";
    console.log(
      `[Socket.io] Connected: ${socket.id} (user: ${userId}, auth: ${socket.data.authenticated})`
    );

    setupMessageHandlers(io, socket);
    setupPresenceHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(
        `[Socket.io] Disconnected: ${socket.id} (reason: ${reason})`
      );
    });
  });

  console.log("[Socket.io] Server initialized");
}

export function getSocketInstance(): AppSocketServer | null {
  return ioInstance;
}
