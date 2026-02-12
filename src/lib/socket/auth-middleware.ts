import type { AppSocket } from "./types";
import { verifyAccessToken } from "@/lib/auth";

/**
 * Socket.io authentication middleware.
 * Extracts JWT from httpOnly cookie during the handshake
 * and attaches user identity to socket.data.
 */
export async function authenticateSocket(
  socket: AppSocket,
  next: (err?: Error) => void
) {
  try {
    const cookieHeader = socket.handshake.headers.cookie;

    if (!cookieHeader) {
      socket.data.authenticated = false;
      return next();
    }

    // Parse cookies manually (avoid extra dependency)
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...rest] = c.trim().split("=");
        return [key, rest.join("=")];
      })
    );

    const authToken = cookies["auth_token"];
    const deviceId = cookies["device_id"];

    // Try JWT authentication
    if (authToken) {
      const session = await verifyAccessToken(authToken);
      if (session) {
        socket.data.userId = session.userId;
        socket.data.authenticated = true;
        socket.join(`user:${session.userId}`);
        return next();
      }
    }

    // Fallback to device_id for anonymous/demo users
    if (deviceId) {
      socket.data.deviceId = deviceId;
      socket.data.authenticated = false;
      socket.join(`user:${deviceId}`);
      return next();
    }

    socket.data.authenticated = false;
    next();
  } catch (error) {
    console.error("[Socket.io] Auth middleware error:", error);
    next(new Error("Authentication failed"));
  }
}
