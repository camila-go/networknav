"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { NetworkGraphData, NetworkNode, NetworkEdge } from "@/types";

interface NetworkGraphProps {
  data: NetworkGraphData | null;
  onNodeClick?: (node: NetworkNode) => void;
  /** Double-click opens profile (skip neutral "You" and discoverable if handled elsewhere) */
  onNodeDoubleClick?: (node: NetworkNode) => void;
  onNodeHover?: (node: NetworkNode | null) => void;
  filter?: "all" | "high-affinity" | "strategic";
  selectedNodeId?: string;
  width?: number;
  height?: number;
}

interface SimulationNode extends NetworkNode, d3.SimulationNodeDatum {}
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  strength: number;
  commonalities: string[];
  isDiscoverable?: boolean;
}

// D3 selection type aliases for stored refs
type LinkSel = d3.Selection<SVGLineElement, SimulationLink, SVGGElement, unknown>;
type CircleSel = d3.Selection<SVGCircleElement, SimulationNode, SVGGElement, unknown>;
type TextSel = d3.Selection<SVGTextElement, SimulationNode, SVGGElement, unknown>;

export function NetworkGraph({
  data,
  onNodeClick,
  onNodeDoubleClick,
  onNodeHover,
  filter = "all",
  selectedNodeId: externalSelectedNodeId,
  width = 800,
  height = 600,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);

  // Use external selectedNodeId if provided, otherwise use internal state
  const selectedNodeId = externalSelectedNodeId ?? internalSelectedNodeId;

  // Refs for D3 selections — allows highlight updates without rebuilding the simulation
  const linkSelectionRef = useRef<LinkSel | null>(null);
  const circleSelectionRef = useRef<CircleSel | null>(null);
  const nameLabelRef = useRef<TextSel | null>(null);
  const titleLabelRef = useRef<TextSel | null>(null);
  const linksDataRef = useRef<SimulationLink[]>([]);
  const selectedNodeIdRef = useRef<string | null>(null);

  // Stable callback refs so prop changes never invalidate the simulation effect
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeHoverRef = useRef(onNodeHover);
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick);
  useEffect(() => { onNodeClickRef.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => { onNodeHoverRef.current = onNodeHover; }, [onNodeHover]);
  useEffect(() => { onNodeDoubleClickRef.current = onNodeDoubleClick; }, [onNodeDoubleClick]);

  // Debounced resize — avoids rebuilding simulation on every pixel change while dragging window border
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const updateDimensions = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          setDimensions({ width: Math.max(width, 400), height: Math.max(height, 400) });
        }
      }, 150);
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      clearTimeout(timeoutId);
    };
  }, []);

  // Filter nodes and edges based on filter prop
  const filteredData = useCallback(() => {
    if (!data) return { nodes: [], edges: [] };
    if (filter === "all") return data;

    const filteredNodes = data.nodes.filter(
      (node) => node.matchType === "neutral" || node.matchType === filter || node.matchType === "discoverable"
    );
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter(
      (edge) => nodeIds.has(edge.source as string) && nodeIds.has(edge.target as string)
    );

    return { ...data, nodes: filteredNodes, edges: filteredEdges };
  }, [data, filter]);

  // Highlight connections — reads from refs, never triggers simulation rebuild
  const highlightConnections = useCallback((clickedNodeId: string | null) => {
    const link = linkSelectionRef.current;
    const circles = circleSelectionRef.current;
    const nameLabels = nameLabelRef.current;
    const titleLabels = titleLabelRef.current;
    const links = linksDataRef.current;

    if (!link || !circles || !nameLabels || !titleLabels) return;

    if (!clickedNodeId) {
      link
        .attr("stroke", (d) => d.isDiscoverable ? "#a78bfa" : "rgba(255,255,255,0.15)")
        .attr("stroke-width", (d) => d.isDiscoverable ? 2 : Math.max(1, d.strength * 3))
        .attr("opacity", (d) => d.isDiscoverable ? 0.7 : 1);
      circles
        .attr("opacity", 1)
        .attr("stroke", "rgba(255,255,255,0.3)")
        .attr("stroke-width", 2);
      nameLabels.attr("opacity", 1);
      titleLabels.attr("opacity", 1);
      return;
    }

    // Compute connected node IDs
    const connectedIds = new Set<string>();
    links.forEach(l => {
      const sourceId = typeof l.source === "object" ? (l.source as SimulationNode).id : l.source as string;
      const targetId = typeof l.target === "object" ? (l.target as SimulationNode).id : l.target as string;
      if (sourceId === clickedNodeId) connectedIds.add(targetId);
      if (targetId === clickedNodeId) connectedIds.add(sourceId);
    });

    link
      .attr("stroke", (l) => {
        const sourceId = typeof l.source === "object" ? (l.source as SimulationNode).id : l.source as string;
        const targetId = typeof l.target === "object" ? (l.target as SimulationNode).id : l.target as string;
        if (sourceId === clickedNodeId || targetId === clickedNodeId) {
          return l.isDiscoverable ? "#c4b5fd" : "#22d3ee";
        }
        return "rgba(255,255,255,0.05)";
      })
      .attr("stroke-width", (l) => {
        const sourceId = typeof l.source === "object" ? (l.source as SimulationNode).id : l.source as string;
        const targetId = typeof l.target === "object" ? (l.target as SimulationNode).id : l.target as string;
        if (sourceId === clickedNodeId || targetId === clickedNodeId) {
          return Math.max(2, l.strength * 5);
        }
        return 1;
      })
      .attr("opacity", (l) => {
        const sourceId = typeof l.source === "object" ? (l.source as SimulationNode).id : l.source as string;
        const targetId = typeof l.target === "object" ? (l.target as SimulationNode).id : l.target as string;
        return sourceId === clickedNodeId || targetId === clickedNodeId ? 1 : 0.3;
      });

    circles
      .attr("opacity", (n) => (n.id === clickedNodeId || connectedIds.has(n.id) ? 1 : 0.15))
      .attr("stroke", (n) => {
        if (n.id === clickedNodeId) return "#22d3ee";
        if (n.matchType === "discoverable" && connectedIds.has(n.id)) return "#c4b5fd";
        return "rgba(255,255,255,0.3)";
      })
      .attr("stroke-width", (n) => (n.id === clickedNodeId ? 3 : 2));

    nameLabels.attr("opacity", (n) =>
      n.id === clickedNodeId || connectedIds.has(n.id) ? 1 : 0.15
    );
    titleLabels.attr("opacity", (n) =>
      n.id === clickedNodeId || connectedIds.has(n.id) ? 1 : 0.15
    );
  }, []); // intentionally empty — reads from refs at call time

  // Highlight-only effect — runs when selection changes, no simulation rebuild
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId ?? null;
    highlightConnections(selectedNodeId ?? null);
  }, [selectedNodeId, highlightConnections]);

  // Main simulation effect — only rebuilds when data, dimensions, or filter change
  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const { nodes: rawNodes, edges: rawEdges } = filteredData();

    const nodes: SimulationNode[] = rawNodes.map((n) => ({ ...n }));
    const discoverableNodeIds = new Set(rawNodes.filter(n => n.matchType === "discoverable").map(n => n.id));

    const links: SimulationLink[] = rawEdges.map((e) => ({
      source: e.source,
      target: e.target,
      strength: e.strength,
      commonalities: e.commonalities,
      isDiscoverable: discoverableNodeIds.has(e.target as string) || discoverableNodeIds.has(e.source as string),
    }));

    // Publish links data so the highlight function can reference them
    linksDataRef.current = links;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const g = svg.append("g");

    // Gradient definitions
    const defs = svg.append("defs");

    const highAffinityGradient = defs.append("linearGradient")
      .attr("id", "highAffinityGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%");
    highAffinityGradient.append("stop").attr("offset", "0%").attr("stop-color", "#0d9488");
    highAffinityGradient.append("stop").attr("offset", "100%").attr("stop-color", "#14b8a6");

    const strategicGradient = defs.append("linearGradient")
      .attr("id", "strategicGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%");
    strategicGradient.append("stop").attr("offset", "0%").attr("stop-color", "#f59e0b");
    strategicGradient.append("stop").attr("offset", "100%").attr("stop-color", "#fbbf24");

    const neutralGradient = defs.append("linearGradient")
      .attr("id", "neutralGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%");
    neutralGradient.append("stop").attr("offset", "0%").attr("stop-color", "#0891b2");
    neutralGradient.append("stop").attr("offset", "100%").attr("stop-color", "#06b6d4");

    const discoverableGradient = defs.append("linearGradient")
      .attr("id", "discoverableGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%");
    discoverableGradient.append("stop").attr("offset", "0%").attr("stop-color", "#8b5cf6");
    discoverableGradient.append("stop").attr("offset", "100%").attr("stop-color", "#a78bfa");

    // Create force simulation with performance-tuned parameters
    const simulation = d3.forceSimulation<SimulationNode>(nodes)
      .alphaDecay(0.05)      // converges in ~60 ticks vs default ~300
      .alphaMin(0.005)       // stops sooner than default 0.001
      .velocityDecay(0.4)
      .force("link", d3.forceLink<SimulationNode, SimulationLink>(links)
        .id((d) => d.id)
        .distance((d) => 120 - d.strength * 40)
        .strength((d) => d.strength * 0.5)
      )
      .force("charge", d3.forceManyBody<SimulationNode>()
        .strength(-300)
        .theta(1.5)          // Barnes-Hut: higher = faster, slightly less precise (default 0.9)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimulationNode>().radius((d) => getNodeRadius(d) + 10));

    // Draw edges
    const link = g.append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, SimulationLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => d.isDiscoverable ? "#a78bfa" : "rgba(255,255,255,0.15)")
      .attr("stroke-width", (d) => d.isDiscoverable ? 2 : Math.max(1, d.strength * 3))
      .attr("stroke-dasharray", (d) => d.isDiscoverable ? "6,4" : "none")
      .attr("opacity", (d) => d.isDiscoverable ? 0.7 : 1);

    // Draw nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimulationNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(drag(simulation) as any);

    const circles = node.append("circle")
      .attr("r", (d) => getNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("stroke", "rgba(255,255,255,0.3)")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.3))");

    const nameLabels = node.append("text")
      .attr("dy", (d) => getNodeRadius(d) + 16)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "rgba(255,255,255,0.9)")
      .text((d) => d.name);

    const titleLabels = node.append("text")
      .attr("dy", (d) => getNodeRadius(d) + 28)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "rgba(255,255,255,0.5)")
      .text((d) => d.title.length > 20 ? d.title.slice(0, 20) + "..." : d.title);

    node.append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => Math.max(10, getNodeRadius(d) * 0.6) + "px")
      .attr("font-weight", "bold")
      .attr("fill", "#000")
      .text((d) => getInitials(d.name));

    // Store selections in refs so the highlight effect can update them without a rebuild
    linkSelectionRef.current = link;
    circleSelectionRef.current = circles;
    nameLabelRef.current = nameLabels;
    titleLabelRef.current = titleLabels;

    node
      .on("click", function (event, d) {
        event.stopPropagation();
        if (selectedNodeIdRef.current === d.id) {
          setInternalSelectedNodeId(null);
        } else {
          setInternalSelectedNodeId(d.id);
        }
        onNodeClickRef.current?.(d);
      })
      .on("dblclick", function (event, d) {
        event.stopPropagation();
        if (d.matchType === "neutral") return;
        onNodeDoubleClickRef.current?.(d);
      });

    // Click on background to deselect
    svg.on("click", () => {
      setInternalSelectedNodeId(null);
    });

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimulationNode).x!)
        .attr("y1", (d) => (d.source as SimulationNode).y!)
        .attr("x2", (d) => (d.target as SimulationNode).x!)
        .attr("y2", (d) => (d.target as SimulationNode).y!);
      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    // Re-apply highlight if a node was selected before this rebuild (e.g. filter change)
    if (selectedNodeIdRef.current) {
      highlightConnections(selectedNodeIdRef.current);
    }

    // Drag behavior
    function drag(simulation: d3.Simulation<SimulationNode, SimulationLink>) {
      function dragstarted(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag<SVGGElement, SimulationNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      simulation.stop();
      linkSelectionRef.current = null;
      circleSelectionRef.current = null;
      nameLabelRef.current = null;
      titleLabelRef.current = null;
    };
  }, [data, dimensions, filter, filteredData, highlightConnections]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-xl overflow-hidden">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
      />
    </div>
  );
}

// Helper functions
function getNodeRadius(node: NetworkNode): number {
  if (node.matchType === "neutral") return 30;
  if (node.matchType === "discoverable") return 16;
  return 18 + (node.commonalityCount || 0) * 3;
}

function getNodeColor(node: NetworkNode): string {
  switch (node.matchType) {
    case "high-affinity":
      return "url(#highAffinityGradient)";
    case "strategic":
      return "url(#strategicGradient)";
    case "discoverable":
      return "url(#discoverableGradient)";
    default:
      return "url(#neutralGradient)";
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
