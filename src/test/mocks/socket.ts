/**
 * Mock Socket.io client and server for testing
 */

type EventHandler = (...args: unknown[]) => void;

/**
 * Create a mock Socket.io client socket
 * Simulates the client-side socket with event emitter pattern
 */
export function createMockSocket() {
  const listeners = new Map<string, Set<EventHandler>>();

  const socket = {
    connected: true,
    id: "mock-socket-id",

    on: vi.fn((event: string, handler: EventHandler) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(handler);
      return socket;
    }),

    off: vi.fn((event: string, handler?: EventHandler) => {
      if (handler) {
        listeners.get(event)?.delete(handler);
      } else {
        listeners.delete(event);
      }
      return socket;
    }),

    emit: vi.fn(),

    disconnect: vi.fn(() => {
      socket.connected = false;
    }),

    connect: vi.fn(() => {
      socket.connected = true;
    }),

    // Test helper: simulate receiving an event
    _simulateEvent(event: string, ...args: unknown[]) {
      listeners.get(event)?.forEach((handler) => handler(...args));
    },

    // Test helper: get registered listeners
    _getListeners(event: string) {
      return listeners.get(event) || new Set();
    },

    // Test helper: clear all listeners
    _clearListeners() {
      listeners.clear();
    },
  };

  return socket;
}

/**
 * Create a mock server-side Socket.io instance
 * Used when mocking getSocketInstance()
 */
export function createMockSocketInstance() {
  return {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    in: vi.fn().mockReturnThis(),
  };
}
