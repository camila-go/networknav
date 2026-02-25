import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeetingRequestModal } from "./meeting-request-modal";
import type { PublicUser, Commonality } from "@/types";

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock AvailabilityView
vi.mock("./availability-view", () => ({
  AvailabilityView: () => <div data-testid="availability-view" />,
}));

// Mock ConflictBadge
vi.mock("./conflict-badge", () => ({
  ConflictBadge: () => <div data-testid="conflict-badge" />,
}));

const mockRecipient: PublicUser = {
  id: "user-2",
  profile: {
    name: "Alice Johnson",
    position: "CTO",
    title: "Tech Leader",
    company: "TechCorp",
  },
  questionnaireCompleted: true,
};

const mockCommonalities: Commonality[] = [
  { category: "professional", description: "Both in Technology", weight: 0.9 },
  { category: "hobby", description: "Both enjoy hiking", weight: 0.7 },
];

describe("MeetingRequestModal", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    } as unknown as Response);
  });

  function renderModal(open = true) {
    return render(
      <MeetingRequestModal
        open={open}
        onOpenChange={mockOnOpenChange}
        recipient={mockRecipient}
        commonalities={mockCommonalities}
        conversationStarters={["Let's discuss AI trends"]}
        onSuccess={mockOnSuccess}
      />
    );
  }

  it("should render dialog when open", () => {
    renderModal(true);
    expect(screen.getByText(/request meeting with/i)).toBeInTheDocument();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
  });

  it("should display recipient info", () => {
    renderModal();
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText(/CTO at TechCorp/)).toBeInTheDocument();
  });

  it("should display meeting type options", () => {
    renderModal();
    expect(screen.getByText("Video Call")).toBeInTheDocument();
    expect(screen.getByText("Coffee/Meal")).toBeInTheDocument();
    expect(screen.getByText("Conference Meetup")).toBeInTheDocument();
    expect(screen.getByText("Phone Call")).toBeInTheDocument();
  });

  it("should display duration selector", () => {
    renderModal();
    expect(screen.getByText("Duration")).toBeInTheDocument();
  });

  it("should display time proposal inputs", () => {
    renderModal();
    expect(screen.getByText(/propose times/i)).toBeInTheDocument();
    // 3 datetime-local inputs
    const timeInputs = screen.getAllByDisplayValue("");
    expect(timeInputs.length).toBeGreaterThanOrEqual(3);
  });

  it("should display commonalities", () => {
    renderModal();
    expect(screen.getByText("Both in Technology")).toBeInTheDocument();
    expect(screen.getByText("Both enjoy hiking")).toBeInTheDocument();
  });

  it("should display conversation starters", () => {
    renderModal();
    expect(screen.getByText(/suggested topics/i)).toBeInTheDocument();
    expect(screen.getByText(/discuss AI trends/i)).toBeInTheDocument();
  });

  it("should select meeting type on click", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText("Coffee/Meal"));

    // The coffee option should now be selected (check border styling or active state)
    const coffeeButton = screen.getByText("Coffee/Meal").closest("button");
    expect(coffeeButton?.className).toContain("border-cyan-500");
  });

  it("should show validation toast if no times proposed", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText(/send request/i));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "Please propose at least one time",
      })
    );
  });

  it("should submit meeting request with correct data", async () => {
    const user = userEvent.setup();
    renderModal();

    // Fill in a time
    const timeInputs = document.querySelectorAll('input[type="datetime-local"]');
    await userEvent.type(timeInputs[0] as HTMLElement, "2026-03-15T10:00");

    await user.click(screen.getByText(/send request/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/meetings",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const fetchCall = vi.mocked(global.fetch).mock.calls.find(
      (call) => call[0] === "/api/meetings"
    );
    if (fetchCall) {
      const body = JSON.parse(fetchCall[1]!.body as string);
      expect(body.recipientId).toBe("user-2");
      expect(body.meetingType).toBe("video");
      expect(body.duration).toBe(30);
    }
  });

  it("should show error toast on API failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: false, error: "Rate limited" }),
    } as unknown as Response);

    const user = userEvent.setup();
    renderModal();

    const timeInputs = document.querySelectorAll('input[type="datetime-local"]');
    await userEvent.type(timeInputs[0] as HTMLElement, "2026-03-15T10:00");

    await user.click(screen.getByText(/send request/i));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Failed to send request",
        })
      );
    });
  });

  it("should show error toast on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    renderModal();

    const timeInputs = document.querySelectorAll('input[type="datetime-local"]');
    await userEvent.type(timeInputs[0] as HTMLElement, "2026-03-15T10:00");

    await user.click(screen.getByText(/send request/i));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Something went wrong",
        })
      );
    });
  });

  it("should call onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText(/cancel/i));

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("should render context message textarea", () => {
    renderModal();
    const textarea = screen.getByPlaceholderText(/what would you like to discuss/i);
    expect(textarea).toBeInTheDocument();
  });

  it("should display character count", async () => {
    const user = userEvent.setup();
    renderModal();

    const textarea = screen.getByPlaceholderText(/what would you like to discuss/i);
    await user.type(textarea, "Hello");

    expect(screen.getByText("5 / 500")).toBeInTheDocument();
  });

  it("should add conversation starter to context message", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByText(/discuss AI trends/i));

    const textarea = screen.getByPlaceholderText(/what would you like to discuss/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain("discuss AI trends");
  });

  it("should display recipient initials in avatar", () => {
    renderModal();
    expect(screen.getByText("AJ")).toBeInTheDocument();
  });
});
