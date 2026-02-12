import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatchCard } from "./match-card";
import type { MatchWithUser } from "@/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the MeetingRequestModal to avoid complex dependency tree
vi.mock("@/components/meetings/meeting-request-modal", () => ({
  MeetingRequestModal: () => null,
}));

function createMatch(overrides: Partial<MatchWithUser> = {}): MatchWithUser {
  return {
    id: "match-1",
    userId: "user-1",
    matchedUserId: "user-2",
    matchedUser: {
      id: "user-2",
      profile: {
        name: "Sarah Chen",
        position: "VP of Engineering",
        title: "Engineering Leader",
        company: "TechCorp",
      },
      questionnaireCompleted: true,
    },
    type: "high-affinity",
    commonalities: [
      { category: "professional", description: "Both in Technology industry", weight: 0.9 },
      { category: "hobby", description: "Both enjoy hiking", weight: 0.7 },
      { category: "values", description: "Share servant leadership philosophy", weight: 0.8 },
    ],
    conversationStarters: [
      "I'd love to hear how you scaled your engineering team",
      "Would be great to swap notes on talent retention",
    ],
    score: 0.92,
    generatedAt: new Date(),
    viewed: false,
    passed: false,
    ...overrides,
  };
}

describe("MatchCard", () => {
  const mockOnPass = vi.fn();
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render matched user name", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
  });

  it("should render position and company", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);
    expect(screen.getByText("VP of Engineering")).toBeInTheDocument();
    expect(screen.getByText("TechCorp")).toBeInTheDocument();
  });

  it("should render high-affinity badge", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);
    expect(screen.getByText("High-Affinity")).toBeInTheDocument();
  });

  it("should render strategic badge for strategic match", () => {
    render(
      <MatchCard
        match={createMatch({ type: "strategic" })}
        onPass={mockOnPass}
        onConnect={mockOnConnect}
      />
    );
    expect(screen.getByText("Strategic")).toBeInTheDocument();
  });

  it("should render match score", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("should render commonalities", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);
    expect(screen.getByText("Both in Technology industry")).toBeInTheDocument();
    expect(screen.getByText("Both enjoy hiking")).toBeInTheDocument();
  });

  it("should render conversation starters", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);
    expect(screen.getByText("I'd love to hear how you scaled your engineering team")).toBeInTheDocument();
  });

  it("should show expand button when more than 3 commonalities", async () => {
    const user = userEvent.setup();
    const match = createMatch({
      commonalities: [
        { category: "professional", description: "Industry match", weight: 0.9 },
        { category: "hobby", description: "Shared hobby", weight: 0.7 },
        { category: "values", description: "Values match", weight: 0.8 },
        { category: "lifestyle", description: "Lifestyle match", weight: 0.6 },
      ],
    });

    render(<MatchCard match={match} onPass={mockOnPass} onConnect={mockOnConnect} />);

    // Should show "+1 more" button
    expect(screen.getByText(/\+1 more/)).toBeInTheDocument();

    // Initially the 4th commonality should not be visible
    expect(screen.queryByText("Lifestyle match")).not.toBeInTheDocument();

    // Click to expand
    await user.click(screen.getByText(/\+1 more/));
    expect(screen.getByText("Lifestyle match")).toBeInTheDocument();
  });

  it("should call onPass when Pass button is clicked", async () => {
    const user = userEvent.setup();
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);

    await user.click(screen.getByText("Pass"));
    expect(mockOnPass).toHaveBeenCalledWith("match-1");
  });

  it("should navigate to messages when Message button is clicked", async () => {
    const user = userEvent.setup();
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);

    await user.click(screen.getByText("Message"));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/messages?userId=user-2")
    );
  });

  it("should render action buttons (Pass, Message, Meet)", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);
    expect(screen.getByText("Pass")).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
    expect(screen.getByText("Meet")).toBeInTheDocument();
  });

  it("should render profile link", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} onConnect={mockOnConnect} />);
    const links = screen.getAllByRole("link");
    const profileLink = links.find((link) => link.getAttribute("href")?.includes("/user/user-2"));
    expect(profileLink).toBeDefined();
  });
});
