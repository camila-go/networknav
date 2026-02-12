"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "./types";

type AppClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let globalSocket: AppClientSocket | null = null;
let refCount = 0;

/**
 * Shared Socket.io connection hook.
 * Uses a singleton socket — multiple components share one connection.
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<AppClientSocket | null>(null);

  useEffect(() => {
    // Create singleton socket on first use
    if (!globalSocket) {
      globalSocket = io({
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    }

    refCount++;
    socketRef.current = globalSocket;

    const socket = globalSocket;

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Set initial state
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      refCount--;

      // Disconnect when no components are using the socket
      if (refCount === 0 && globalSocket) {
        globalSocket.disconnect();
        globalSocket = null;
      }
    };
  }, []);

  const emit = useCallback(
    <E extends keyof ClientToServerEvents>(
      event: E,
      ...args: Parameters<ClientToServerEvents[E]>
    ) => {
      socketRef.current?.emit(event, ...args);
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected,
    emit,
  };
}
