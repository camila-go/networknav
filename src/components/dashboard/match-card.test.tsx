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
        title: "Engineering Leader",
        company: "TechCorp",
      },
      questionnaireCompleted: true,
    },
    type: "high-affinity",
    commonalities: [
      { category: "professional", description: "Both at VP / executive director level", weight: 0.9 },
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render matched user name", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} />);
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
  });

  it("should render title and company", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} />);
    expect(screen.getByText("Engineering Leader")).toBeInTheDocument();
    expect(screen.getByText("TechCorp")).toBeInTheDocument();
  });

  it("should render high-affinity banner", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} />);
    expect(screen.getByText("HIGH AFFINITY")).toBeInTheDocument();
  });

  it("should render strategic banner for strategic match", () => {
    render(
      <MatchCard
        match={createMatch({ type: "strategic" })}
        onPass={mockOnPass}
      />
    );
    expect(screen.getByText("STRATEGIC")).toBeInTheDocument();
  });

  it("should render match score", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} />);
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("should render commonalities", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} />);
    expect(screen.getByText("Both at VP / executive director level")).toBeInTheDocument();
    expect(screen.getByText("Both enjoy hiking")).toBeInTheDocument();
  });

  it("should render personalized conversation starters", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} viewerFirstName="Alex" />);
    expect(screen.getByText(/conversation starter/i)).toBeInTheDocument();
    const section = screen.getByText(/conversation starter/i).closest("div");
    expect(section?.textContent).toMatch(/Sarah|Technology|hiking|leadership|TechCorp|VP/i);
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

    render(<MatchCard match={match} onPass={mockOnPass} />);

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
    render(<MatchCard match={createMatch()} onPass={mockOnPass} />);

    await user.click(screen.getByText("Pass"));
    expect(mockOnPass).toHaveBeenCalledWith("match-1");
  });

  it("should show TeamsActionButtons when matchedUser has email", () => {
    const matchWithEmail = createMatch({
      matchedUser: {
        id: "user-2",
        email: "sarah@techcorp.com",
        profile: {
          name: "Sarah Chen",
          title: "Engineering Leader",
          company: "TechCorp",
        },
        questionnaireCompleted: true,
      },
    });
    render(<MatchCard match={matchWithEmail} onPass={mockOnPass} />);
    // TeamsActionButtons renders Chat button
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("should render Pass button when matchedUser has no email", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} />);
    expect(screen.getByText("Pass")).toBeInTheDocument();
  });

  it("should render profile link", () => {
    render(<MatchCard match={createMatch()} onPass={mockOnPass} />);
    const links = screen.getAllByRole("link");
    const profileLink = links.find((link) => link.getAttribute("href")?.includes("/user/user-2"));
    expect(profileLink).toBeDefined();
  });
});
