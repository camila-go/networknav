"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { NetworkGraphData, NetworkNode, NetworkEdge } from "@/types";
import { cn } from "@/lib/utils";

interface NetworkGraphProps {
  data: NetworkGraphData;
  onNodeClick?: (node: NetworkNode) => void;
  onNodeHover?: (node: NetworkNode | null) => void;
  filter?: "all" | "high-affinity" | "strategic";
  width?: number;
  height?: number;
}

interface SimulationNode extends NetworkNode, d3.SimulationNodeDatum {}
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  strength: number;
  commonalities: string[];
}

export function NetworkGraph({
  data,
  onNodeClick,
  onNodeHover,
  filter = "all",
  width = 800,
  height = 600,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 400), height: Math.max(height, 400) });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Filter nodes and edges based on filter prop
  const filteredData = useCallback(() => {
    if (filter === "all") return data;

    const filteredNodes = data.nodes.filter(
      (node) => node.matchType === "neutral" || node.matchType === filter
    );
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter(
      (edge) => nodeIds.has(edge.source as string) && nodeIds.has(edge.target as string)
    );

    return { ...data, nodes: filteredNodes, edges: filteredEdges };
  }, [data, filter]);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const { nodes: rawNodes, edges: rawEdges } = filteredData();

    // Clone data for D3 simulation
    const nodes: SimulationNode[] = rawNodes.map((n) => ({ ...n }));
    const links: SimulationLink[] = rawEdges.map((e) => ({
      source: e.source,
      target: e.target,
      strength: e.strength,
      commonalities: e.commonalities,
    }));

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create main group for zoom/pan
    const g = svg.append("g");

    // Add gradient definitions
    const defs = svg.append("defs");

    // High-affinity gradient
    const highAffinityGradient = defs.append("linearGradient")
      .attr("id", "highAffinityGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%");
    highAffinityGradient.append("stop").attr("offset", "0%").attr("stop-color", "#0d9488");
    highAffinityGradient.append("stop").attr("offset", "100%").attr("stop-color", "#14b8a6");

    // Strategic gradient
    const strategicGradient = defs.append("linearGradient")
      .attr("id", "strategicGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%");
    strategicGradient.append("stop").attr("offset", "0%").attr("stop-color", "#f59e0b");
    strategicGradient.append("stop").attr("offset", "100%").attr("stop-color", "#fbbf24");

    // Neutral gradient (center node)
    const neutralGradient = defs.append("linearGradient")
      .attr("id", "neutralGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%");
    neutralGradient.append("stop").attr("offset", "0%").attr("stop-color", "#0891b2");
    neutralGradient.append("stop").attr("offset", "100%").attr("stop-color", "#06b6d4");

    // Create force simulation
    const simulation = d3.forceSimulation<SimulationNode>(nodes)
      .force("link", d3.forceLink<SimulationNode, SimulationLink>(links)
        .id((d) => d.id)
        .distance((d) => 120 - d.strength * 40)
        .strength((d) => d.strength * 0.5)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimulationNode>().radius((d) => getNodeRadius(d) + 10));

    // Draw edges
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.max(1, d.strength * 4));

    // Draw nodes
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, SimulationNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(drag(simulation) as any);

    // Node circles
    node.append("circle")
      .attr("r", (d) => getNodeRadius(d))
      .attr("fill", (d) => getNodeColor(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.1))");

    // Node labels (name)
    node.append("text")
      .attr("dy", (d) => getNodeRadius(d) + 16)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#334155")
      .text((d) => d.name);

    // Node title labels (smaller)
    node.append("text")
      .attr("dy", (d) => getNodeRadius(d) + 28)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", "#64748b")
      .text((d) => d.title.length > 20 ? d.title.slice(0, 20) + "..." : d.title);

    // Add initials to nodes
    node.append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .attr("font-size", (d) => Math.max(10, getNodeRadius(d) * 0.6) + "px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .text((d) => getInitials(d.name));

    // Hover effects
    node
      .on("mouseenter", function (event, d) {
        // Highlight connected nodes and edges
        link
          .attr("stroke-opacity", (l) =>
            l.source === d || l.target === d ? 1 : 0.1
          )
          .attr("stroke", (l) =>
            l.source === d || l.target === d ? "#0891b2" : "#cbd5e1"
          );

        node.selectAll("circle")
          .attr("opacity", (n) => {
            if (n === d) return 1;
            const connected = links.some(
              (l) =>
                (l.source === d && l.target === n) ||
                (l.target === d && l.source === n)
            );
            return connected ? 1 : 0.3;
          });

        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", getNodeRadius(d) + 4);

        onNodeHover?.(d);
      })
      .on("mouseleave", function (event, d) {
        // Reset styles
        link
          .attr("stroke-opacity", 0.6)
          .attr("stroke", "#cbd5e1");

        node.selectAll("circle")
          .attr("opacity", 1);

        d3.select(this).select("circle")
          .transition()
          .duration(200)
          .attr("r", getNodeRadius(d));

        onNodeHover?.(null);
      })
      .on("click", (event, d) => {
        onNodeClick?.(d);
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

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [data, dimensions, filter, filteredData, onNodeClick, onNodeHover]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden">
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
  if (node.matchType === "neutral") return 30; // Center node
  return 18 + (node.commonalityCount || 0) * 3;
}

function getNodeColor(node: NetworkNode): string {
  switch (node.matchType) {
    case "high-affinity":
      return "url(#highAffinityGradient)";
    case "strategic":
      return "url(#strategicGradient)";
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

