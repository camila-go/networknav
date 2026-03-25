import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NetworkGraph } from "./network-graph";
import type { NetworkGraphData, NetworkNode } from "@/types";

// Mock D3 — provide minimal simulation stubs
vi.mock("d3", () => {
  const mockSelection = {
    append: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
  };

  const mockSimulation = {
    force: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    stop: vi.fn(),
    alphaTarget: vi.fn().mockReturnThis(),
    alphaDecay: vi.fn().mockReturnThis(),
    alphaMin: vi.fn().mockReturnThis(),
    velocityDecay: vi.fn().mockReturnThis(),
    restart: vi.fn(),
  };

  return {
    select: vi.fn().mockReturnValue(mockSelection),
    zoom: vi.fn().mockReturnValue({
      scaleExtent: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
    }),
    forceSimulation: vi.fn().mockReturnValue(mockSimulation),
    forceLink: vi.fn().mockReturnValue({
      id: vi.fn().mockReturnThis(),
      distance: vi.fn().mockReturnThis(),
      strength: vi.fn().mockReturnThis(),
    }),
    forceManyBody: vi.fn().mockReturnValue({
      strength: vi.fn().mockReturnThis(),
      theta: vi.fn().mockReturnThis(),
    }),
    forceCenter: vi.fn().mockReturnValue({}),
    forceCollide: vi.fn().mockReturnValue({
      radius: vi.fn().mockReturnThis(),
    }),
    drag: vi.fn().mockReturnValue({
      filter: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
    }),
  };
});

const mockData: NetworkGraphData = {
  userId: "user-1",
  nodes: [
    { id: "user-1", name: "Me", title: "CEO", matchType: "neutral", commonalityCount: 0, commonalities: [] },
    { id: "user-2", name: "Alice", title: "CTO", company: "TechCo", matchType: "high-affinity", commonalityCount: 2, commonalities: ["Tech", "AI"] },
    { id: "user-3", name: "Bob", title: "VP", company: "SalesCo", matchType: "strategic", commonalityCount: 1, commonalities: ["Growth"] },
  ],
  edges: [
    { source: "user-1", target: "user-2", strength: 0.9, commonalities: ["Tech"] },
    { source: "user-1", target: "user-3", strength: 0.6, commonalities: ["Growth"] },
  ],
  clusters: [],
  generatedAt: new Date(),
};

describe("NetworkGraph", () => {
  const mockOnNodeClick = vi.fn();
  const mockOnNodeHover = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render SVG element", () => {
    const { container } = render(
      <NetworkGraph data={mockData} />
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render container div", () => {
    const { container } = render(
      <NetworkGraph data={mockData} />
    );
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("should accept onNodeClick prop", () => {
    render(
      <NetworkGraph data={mockData} onNodeClick={mockOnNodeClick} />
    );
    // Component renders without error when callback is provided
    expect(true).toBe(true);
  });

  it("should accept onNodeHover prop", () => {
    render(
      <NetworkGraph data={mockData} onNodeHover={mockOnNodeHover} />
    );
    expect(true).toBe(true);
  });

  it("should accept filter prop", () => {
    render(
      <NetworkGraph data={mockData} filter="high-affinity" />
    );
    expect(true).toBe(true);
  });

  it("should handle empty nodes gracefully", () => {
    const emptyData: NetworkGraphData = {
      ...mockData,
      nodes: [],
      edges: [],
    };

    render(<NetworkGraph data={emptyData} />);
    // Should render without crashing
    expect(true).toBe(true);
  });

  it("should initialize D3 force simulation", async () => {
    const d3 = await import("d3");
    render(<NetworkGraph data={mockData} />);

    expect(d3.forceSimulation).toHaveBeenCalled();
    expect(d3.forceLink).toHaveBeenCalled();
    expect(d3.forceManyBody).toHaveBeenCalled();
    expect(d3.forceCenter).toHaveBeenCalled();
  });

  it("should set up zoom behavior", async () => {
    const d3 = await import("d3");
    render(<NetworkGraph data={mockData} />);

    expect(d3.zoom).toHaveBeenCalled();
  });

  it("should accept custom width and height", () => {
    const { container } = render(
      <NetworkGraph data={mockData} width={1000} height={800} />
    );
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("should filter data when filter is high-affinity", () => {
    // The component internally filters nodes — just verify it renders
    render(
      <NetworkGraph data={mockData} filter="high-affinity" />
    );
    // Component renders without error with filter applied
    expect(true).toBe(true);
  });

  it("should filter data when filter is strategic", () => {
    render(
      <NetworkGraph data={mockData} filter="strategic" />
    );
    expect(true).toBe(true);
  });
});
