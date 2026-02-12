import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { NotificationBell } from "./notification-bell";

// Mock useSocket
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: false,
};
vi.mock("@/lib/socket/client", () => ({
  useSocket: () => ({
    socket: mockSocket,
    isConnected: mockSocket.connected,
  }),
}));

// Mock NotificationList to simplify
vi.mock("./notification-list", () => ({
  NotificationList: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="notification-list">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, data: { unreadCount: 0 } }),
    });
  });

  it("should render bell icon button", () => {
    render(<NotificationBell />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should fetch initial unread count on mount", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { unreadCount: 3 } }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notifications?type=count");
    });
  });

  it("should display unread count badge", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { unreadCount: 5 } }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
    });
  });

  it("should display 9+ for counts over 9", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { unreadCount: 15 } }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  it("should not show badge when count is 0", async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.queryByText("0")).not.toBeInTheDocument();
      expect(screen.queryByText("9+")).not.toBeInTheDocument();
    });
  });

  it("should register socket listener for new notifications", () => {
    render(<NotificationBell />);
    expect(mockSocket.on).toHaveBeenCalledWith("notification:new", expect.any(Function));
  });

  it("should increment count on socket notification event", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { unreadCount: 2 } }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    // Simulate socket notification
    const handler = mockSocket.on.mock.calls.find(
      (call: unknown[]) => call[0] === "notification:new"
    )?.[1] as (() => void) | undefined;

    if (handler) {
      act(() => handler());
    }

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("should include unread count in aria-label", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { unreadCount: 3 } }),
    } as Response);

    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByLabelText(/notifications.*3 unread/i)).toBeInTheDocument();
    });
  });
});
