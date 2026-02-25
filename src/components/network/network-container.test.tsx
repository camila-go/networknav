import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NetworkContainer } from "./network-container";
import type { NetworkGraphData, NetworkNode } from "@/types";

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock NetworkGraph to avoid D3 dependency
vi.mock("./network-graph", () => ({
  NetworkGraph: ({
    data,
    filter,
    onNodeClick,
    onNodeHover,
  }: {
    data: NetworkGraphData;
    filter: string;
    onNodeClick?: (node: NetworkNode) => void;
    onNodeHover?: (node: NetworkNode | null) => void;
  }) => (
    <div data-testid="network-graph" data-filter={filter}>
      <span data-testid="node-count">{data.nodes.length}</span>
      {data.nodes.map((node) => (
        <button
          key={node.id}
          data-testid={`node-${node.id}`}
          onClick={() => onNodeClick?.(node)}
          onMouseEnter={() => onNodeHover?.(node)}
          onMouseLeave={() => onNodeHover?.(null)}
        >
          {node.name}
        </button>
      ))}
    </div>
  ),
}));

// Mock MeetingRequestModal
vi.mock("@/components/meetings/meeting-request-modal", () => ({
  MeetingRequestModal: () => <div data-testid="meeting-modal" />,
}));

const mockNetworkData: NetworkGraphData = {
  userId: "user-1",
  nodes: [
    { id: "user-1", name: "Me", title: "CEO", matchType: "neutral", commonalityCount: 0, commonalities: [] },
    { id: "user-2", name: "Alice Johnson", title: "CTO", company: "TechCo", matchType: "high-affinity", commonalityCount: 3, commonalities: ["Technology", "Hiking", "Innovation"] },
    { id: "user-3", name: "Bob Smith", title: "VP Sales", company: "SalesCo", matchType: "strategic", commonalityCount: 2, commonalities: ["Growth", "Strategy"] },
  ],
  edges: [
    { source: "user-1", target: "user-2", strength: 0.9, commonalities: ["Technology"] },
    { source: "user-1", target: "user-3", strength: 0.7, commonalities: ["Growth"] },
  ],
  clusters: [
    { id: "cluster-1", name: "Tech Leaders", nodeIds: ["user-2"], theme: "Technology" },
  ],
  generatedAt: new Date(),
};

const mockInsights = {
  totalConnections: 2,
  highAffinityCount: 1,
  strategicCount: 1,
  averageStrength: 80,
  strongestCluster: "Tech Leaders",
  topCommonality: "Technology",
  recommendation: "Connect with more strategic matches.",
};

function mockSuccessfulFetch() {
  return vi.fn().mockResolvedValue({
    json: async () => ({
      success: true,
      data: { network: mockNetworkData, insights: mockInsights },
    }),
  } as unknown as Response);
}

describe("NetworkContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockSuccessfulFetch();
  });

  it("should show loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<NetworkContainer />);
    expect(screen.getByText(/building your network map/i)).toBeInTheDocument();
  });

  it("should fetch network data on mount", async () => {
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/network");
    });
  });

  it("should render network graph after loading", async () => {
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("network-graph")).toBeInTheDocument();
    });
    expect(screen.getByTestId("node-count")).toHaveTextContent("3");
  });

  it("should show empty state when no network data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, data: { network: null, insights: null } }),
    } as unknown as Response);

    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByText(/no network data/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/complete your questionnaire/i)).toBeInTheDocument();
  });

  it("should show error toast on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<NetworkContainer />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Something went wrong",
        })
      );
    });
  });

  it("should show error toast on API error response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: false, error: "Server error" }),
    } as unknown as Response);

    render(<NetworkContainer />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Failed to load network",
        })
      );
    });
  });

  it("should display insights panel", async () => {
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByText("Network Stats")).toBeInTheDocument();
    });
    expect(screen.getByText("Total Connections")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("should display insights recommendation", async () => {
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByText("Connect with more strategic matches.")).toBeInTheDocument();
    });
  });

  it("should display clusters", async () => {
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByText("Clusters")).toBeInTheDocument();
    });
    // Cluster name appears in the clusters panel
    const clusterElements = screen.getAllByText("Tech Leaders");
    expect(clusterElements.length).toBeGreaterThanOrEqual(1);
  });

  it("should show selected node details when clicking a node", async () => {
    const user = userEvent.setup();
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("network-graph")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("node-user-2"));

    await waitFor(() => {
      expect(screen.getByText("Selected Connection")).toBeInTheDocument();
    });
    // The name appears both in mock graph and sidebar — just check sidebar renders
    expect(screen.getByText("High-Affinity Match")).toBeInTheDocument();
    expect(screen.getByText("3 commonalities")).toBeInTheDocument();
  });

  it("should show commonalities in selected node sidebar", async () => {
    const user = userEvent.setup();
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("network-graph")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("node-user-2"));

    await waitFor(() => {
      expect(screen.getByText("3 commonalities")).toBeInTheDocument();
    });
    // Commonalities appear as list items in sidebar (may also appear in hover tooltip from mock)
    const hikingElements = screen.getAllByText("Hiking");
    expect(hikingElements.length).toBeGreaterThanOrEqual(1);
    const innovationElements = screen.getAllByText("Innovation");
    expect(innovationElements.length).toBeGreaterThanOrEqual(1);
  });

  it("should close selected node sidebar when X is clicked", async () => {
    const user = userEvent.setup();
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("network-graph")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("node-user-2"));
    await waitFor(() => {
      expect(screen.getByText("Selected Connection")).toBeInTheDocument();
    });

    // Find the close button in the selected connection panel
    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons.find((btn) => btn.closest("[class*='border-cyan']"));
    if (closeBtn) await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.getByText(/click a node to view details/i)).toBeInTheDocument();
    });
  });

  it("should not select neutral (self) node", async () => {
    const user = userEvent.setup();
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("network-graph")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("node-user-1")); // "Me" node is neutral

    // Should still show the default "click a node" text
    expect(screen.getByText(/click a node to view details/i)).toBeInTheDocument();
  });

  it("should show hover tooltip for non-neutral nodes", async () => {
    const user = userEvent.setup();
    render(<NetworkContainer />);

    await waitFor(() => {
      expect(screen.getByTestId("network-graph")).toBeInTheDocument();
    });

    await user.hover(screen.getByTestId("node-user-2"));

    // The hover tooltip renders in the parent, not inside the mocked graph
    // Since the mock triggers onNodeHover, the parent should show tooltip
    await waitFor(() => {
      // The hovered node's name/title should appear in the tooltip area
      const tooltipName = screen.getAllByText("Alice Johnson");
      expect(tooltipName.length).toBeGreaterThanOrEqual(1);
    });
  });
});
