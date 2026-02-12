import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatWindow } from "./chat-window";
import type { Connection } from "@/types";

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

// Mock formatRelativeTime
vi.mock("@/lib/utils", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...orig,
    formatRelativeTime: () => "Just now",
  };
});

function createConversation(overrides = {}) {
  return {
    connectionId: "conn-1",
    connection: {
      id: "conn-1",
      requesterId: "user-1",
      recipientId: "user-2",
      status: "accepted" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Connection,
    lastMessage: undefined,
    unreadCount: 0,
    messageCount: 0,
    otherUser: {
      id: "user-2",
      name: "Sarah Chen",
      position: "VP of Engineering",
      company: "TechCorp",
    },
    ...overrides,
  };
}

describe("ChatWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should render other user's name", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { messages: [] } }),
    } as Response);

    render(<ChatWindow conversation={createConversation()} />);
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
  });

  it("should render back button when isMobile", async () => {
    const mockBack = vi.fn();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { messages: [] } }),
    } as Response);

    render(<ChatWindow conversation={createConversation()} onBack={mockBack} isMobile />);
    // The back button has no text, just an ArrowLeft icon — find all buttons and check for the one in the header
    const buttons = screen.getAllByRole("button");
    // Should have at least 2 buttons (back + send)
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("should fetch and display messages", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          messages: [
            {
              id: "msg-1",
              connectionId: "conn-1",
              senderId: "user-2",
              content: "Hello there!",
              read: true,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    } as Response);

    render(<ChatWindow conversation={createConversation()} />);

    await waitFor(() => {
      expect(screen.getByText("Hello there!")).toBeInTheDocument();
    });
  });

  it("should show empty state for new conversation", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { messages: [] } }),
    } as Response);

    render(<ChatWindow conversation={createConversation()} />);

    await waitFor(() => {
      expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
    });
  });

  it("should render message input", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { messages: [] } }),
    } as Response);

    render(<ChatWindow conversation={createConversation()} />);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
  });

  it("should send message via HTTP when socket not connected", async () => {
    const user = userEvent.setup();
    const mockOnMessageSent = vi.fn();

    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { messages: [] } }),
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            message: {
              id: "new-msg",
              connectionId: "conn-1",
              senderId: "user-1",
              content: "Hey!",
              read: false,
              createdAt: new Date().toISOString(),
            },
          },
        }),
      } as Response);

    render(
      <ChatWindow
        conversation={createConversation()}
        onMessageSent={mockOnMessageSent}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type a message/i);
    await user.type(input, "Hey!");

    // Submit the form
    const submitButton = screen.getByRole("button", { name: "" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/messages", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("should join socket room on mount with connectionId", () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { messages: [] } }),
    } as Response);

    render(<ChatWindow conversation={createConversation()} />);
    expect(mockSocket.emit).toHaveBeenCalledWith("conversation:join", "conn-1");
  });

  it("should listen for new messages via socket", () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { messages: [] } }),
    } as Response);

    render(<ChatWindow conversation={createConversation()} />);
    expect(mockSocket.on).toHaveBeenCalledWith("message:new", expect.any(Function));
  });

  it("should listen for typing indicators via socket", () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { messages: [] } }),
    } as Response);

    render(<ChatWindow conversation={createConversation()} />);
    expect(mockSocket.on).toHaveBeenCalledWith("message:typing", expect.any(Function));
  });

  it("should render new conversation mode", () => {
    render(
      <ChatWindow
        newConversation={{ userId: "user-3", userName: "Jane Doe" }}
      />
    );

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument();
  });
});
