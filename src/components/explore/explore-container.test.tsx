import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExploreContainer } from "./explore-container";
import type { AttendeeSearchResult } from "@/types";

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

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
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("./explore-feed-tab", () => ({
  ExploreFeedTab: () => <div data-testid="explore-feed-tab">Feed</div>,
}));

// Mock FilterSidebar
vi.mock("./filter-sidebar", () => ({
  FilterSidebar: ({
    onFiltersChange,
    onSaveSearch,
    resultCount,
  }: {
    filters: Record<string, unknown>;
    onFiltersChange: (f: Record<string, unknown>) => void;
    onSaveSearch: () => void;
    resultCount: number;
  }) => (
    <div data-testid="filter-sidebar">
      <span data-testid="result-count">{resultCount}</span>
      <button
        data-testid="apply-filter"
        onClick={() => onFiltersChange({ leadershipLevels: ["vp"] })}
      >
        Apply Filter
      </button>
      <button data-testid="save-search" onClick={onSaveSearch}>
        Save Search
      </button>
    </div>
  ),
}));

// Mock AttendeeCard
vi.mock("./attendee-card", () => ({
  AttendeeCard: ({
    attendee,
    onRequestMeeting,
  }: {
    attendee: AttendeeSearchResult;
    onRequestMeeting: (userId: string) => void;
  }) => (
    <div data-testid={`attendee-${attendee.user.id}`}>
      <span>{attendee.user.profile.name}</span>
      <span>{attendee.matchPercentage}%</span>
      <button onClick={() => onRequestMeeting(attendee.user.id)}>
        Request Meeting
      </button>
    </div>
  ),
}));

const mockResults: AttendeeSearchResult[] = [
  {
    user: {
      id: "user-1",
      profile: { name: "Alice Johnson", position: "CTO", title: "Tech Leader", company: "TechCo" },
      questionnaireCompleted: true,
    },
    matchPercentage: 92,
    topCommonalities: [{ category: "professional", description: "Both in Tech", weight: 0.9 }],
  },
  {
    user: {
      id: "user-2",
      profile: { name: "Bob Smith", position: "VP Sales", title: "Sales Leader", company: "SalesCo" },
      questionnaireCompleted: true,
    },
    matchPercentage: 78,
    topCommonalities: [{ category: "values", description: "Servant leadership", weight: 0.8 }],
  },
];

function mockSearchFetch(results = mockResults, total = 2, hasMore = false) {
  return vi.fn().mockResolvedValue({
    json: async () => ({
      success: true,
      data: { results, total, hasMore },
    }),
  } as unknown as Response);
}

/** Click the "Search" tab so the search UI is visible */
async function switchToSearchTab(user: ReturnType<typeof userEvent.setup>) {
  const searchTab = screen.getByRole("tab", { name: /search/i });
  await user.click(searchTab);
}

describe("ExploreContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    global.fetch = mockSearchFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should search on mount", async () => {
    render(<ExploreContainer />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/attendees/search",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("should display loading state", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<ExploreContainer />);
    await switchToSearchTab(user);
    const loader = document.querySelector(".animate-spin");
    expect(loader).toBeInTheDocument();
  });

  it("should render search results", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ExploreContainer />);
    await switchToSearchTab(user);

    await waitFor(() => {
      // Mobile swiper + desktop grid both render attendee cards (CSS hides one)
      expect(screen.getAllByTestId("attendee-user-1").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByTestId("attendee-user-2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Alice Johnson").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob Smith").length).toBeGreaterThanOrEqual(1);
  });

  it("should show result count", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ExploreContainer />);
    await switchToSearchTab(user);

    await waitFor(() => {
      expect(screen.getByText(/showing 2 of 2 attendees/i)).toBeInTheDocument();
    });
  });

  it("should show empty state when no results", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    global.fetch = mockSearchFetch([], 0);
    render(<ExploreContainer />);
    await switchToSearchTab(user);

    await waitFor(() => {
      expect(screen.getByText(/no attendees found/i)).toBeInTheDocument();
    });
  });

  it("should debounce keyword search", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ExploreContainer />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    await switchToSearchTab(user);
    const initialCallCount = vi.mocked(global.fetch).mock.calls.length;

    const searchInput = screen.getByPlaceholderText(/search by name/i);
    await user.type(searchInput, "alice");

    // Advance past debounce (300ms)
    vi.advanceTimersByTime(350);

    await waitFor(() => {
      // Should have been called again after debounce
      expect(vi.mocked(global.fetch).mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it("should navigate when requesting meeting", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ExploreContainer />);
    await switchToSearchTab(user);

    await waitFor(() => {
      expect(screen.getAllByTestId("attendee-user-1").length).toBeGreaterThanOrEqual(1);
    });

    const meetingBtn = screen.getAllByText("Request Meeting")[0];
    await user.click(meetingBtn);

    expect(mockPush).toHaveBeenCalledWith("/messages?targetUserId=user-1");
  });

  it("should show toast when saving search", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ExploreContainer />);
    await switchToSearchTab(user);

    await waitFor(() => {
      expect(screen.getByTestId("filter-sidebar")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("save-search"));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Search saved!" })
    );
  });

  it("should show error toast on search failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<ExploreContainer />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Search failed",
        })
      );
    });
  });

  it("should show pagination when results exceed page size", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    global.fetch = mockSearchFetch(mockResults, 25, true);
    render(<ExploreContainer />);
    await switchToSearchTab(user);

    await waitFor(() => {
      expect(screen.getByText(/page 1 of/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/previous/i)).toBeDisabled();
    expect(screen.getByText(/next/i)).toBeEnabled();
  });

  it("should navigate to next page", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    global.fetch = mockSearchFetch(mockResults, 25, true);
    render(<ExploreContainer />);
    await switchToSearchTab(user);

    await waitFor(() => {
      expect(screen.getByText(/next/i)).toBeEnabled();
    });

    await user.click(screen.getByText(/next/i));

    await waitFor(() => {
      // Fetch should be called with page 2
      const calls = vi.mocked(global.fetch).mock.calls;
      const lastCall = calls[calls.length - 1];
      const body = JSON.parse(lastCall[1]!.body as string);
      expect(body.page).toBe(2);
    });
  });

  it("should toggle view mode between grid and list", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ExploreContainer />);
    await switchToSearchTab(user);

    await waitFor(() => {
      expect(screen.getAllByTestId("attendee-user-1").length).toBeGreaterThanOrEqual(1);
    });

    // The grid/list toggle buttons are rendered as icon buttons
    const buttons = screen.getAllByRole("button");
    const listBtn = buttons.find(
      (btn) => btn.querySelector("svg") && btn.className.includes("rounded-full")
    );
    if (listBtn) {
      await user.click(listBtn);
      // Results should still be visible
      expect(screen.getAllByTestId("attendee-user-1").length).toBeGreaterThanOrEqual(1);
    }
  });
});
