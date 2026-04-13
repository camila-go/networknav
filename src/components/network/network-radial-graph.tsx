"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { NetworkGraphData, NetworkNode, NetworkEdge } from "@/types";

interface NetworkRadialGraphProps {
  data: NetworkGraphData | null;
  onNodeClick?: (node: NetworkNode) => void;
  onNodeDoubleClick?: (node: NetworkNode) => void;
  filter?: "all" | "high-affinity" | "strategic";
  selectedNodeId?: string;
}

interface PositionedNode extends NetworkNode {
  x: number;
  y: number;
}

interface PositionedLink {
  source: PositionedNode;
  target: PositionedNode;
  strength: number;
  isDiscoverable?: boolean;
}

export function NetworkRadialGraph({
  data,
  onNodeClick,
  onNodeDoubleClick,
  filter = "all",
  selectedNodeId: externalSelectedNodeId,
}: NetworkRadialGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [internalSelectedNodeId, setInternalSelectedNodeId] = useState<string | null>(null);

  const selectedNodeId = externalSelectedNodeId ?? internalSelectedNodeId;

  // Stable callback refs
  const onNodeClickRef = useRef(onNodeClick);
  const onNodeDoubleClickRef = useRef(onNodeDoubleClick);
  useEffect(() => { onNodeClickRef.current = onNodeClick; }, [onNodeClick]);
  useEffect(() => { onNodeDoubleClickRef.current = onNodeDoubleClick; }, [onNodeDoubleClick]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let resizeTimer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({
          width: Math.max(300, rect.width),
          height: Math.max(300, rect.height),
        });
      }
    };
    measure();
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 100); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(resizeTimer); };
  }, []);

  // Filter data
  const filteredData = useCallback((): { nodes: PositionedNode[]; links: PositionedLink[] } | null => {
    if (!data) return null;

    let nodes = data.nodes;
    if (filter !== "all") {
      nodes = nodes.filter(n => n.matchType === "neutral" || n.matchType === filter || n.matchType === "discoverable");
    }

    // Build edge lookup
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = data.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({
        source: nodes.find(n => n.id === e.source)!,
        target: nodes.find(n => n.id === e.target)!,
        strength: e.strength,
        isDiscoverable: nodes.find(n => n.id === e.target)?.matchType === "discoverable" ||
                        nodes.find(n => n.id === e.source)?.matchType === "discoverable",
      }))
      .filter(l => l.source && l.target);

    // Layout calculation
    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) / 2 - 30;

    const centerNode = nodes.find(n => n.matchType === "neutral");
    const highAffinity = nodes.filter(n => n.matchType === "high-affinity");
    const strategic = nodes.filter(n => n.matchType === "strategic");
    const discoverable = nodes.filter(n => n.matchType === "discoverable");

    const positioned: PositionedNode[] = [];

    // Center
    if (centerNode) {
      positioned.push({ ...centerNode, x: cx, y: cy });
    }

    // Deterministic jitter from node id
    const jitter = (id: string, scale: number) => {
      let hash = 0;
      for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
      return ((hash % 100) / 100) * scale;
    };

    // Inner ring — high-affinity
    const innerR = maxR * 0.35;
    highAffinity.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(highAffinity.length, 1) - Math.PI / 2;
      positioned.push({
        ...node,
        x: cx + innerR * Math.cos(angle) + jitter(node.id, 6),
        y: cy + innerR * Math.sin(angle) + jitter(node.id + "y", 6),
      });
    });

    // Outer ring(s) — strategic
    if (strategic.length <= 24) {
      const outerR = maxR * 0.72;
      strategic.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / Math.max(strategic.length, 1) - Math.PI / 2;
        positioned.push({
          ...node,
          x: cx + outerR * Math.cos(angle) + jitter(node.id, 5),
          y: cy + outerR * Math.sin(angle) + jitter(node.id + "y", 5),
        });
      });
    } else {
      // Split into two staggered rings
      const half = Math.ceil(strategic.length / 2);
      const r1 = maxR * 0.6;
      const r2 = maxR * 0.82;
      strategic.forEach((node, i) => {
        const ring = i < half ? r1 : r2;
        const count = i < half ? half : strategic.length - half;
        const idx = i < half ? i : i - half;
        const offset = i < half ? 0 : Math.PI / count; // stagger
        const angle = (2 * Math.PI * idx) / count - Math.PI / 2 + offset;
        positioned.push({
          ...node,
          x: cx + ring * Math.cos(angle) + jitter(node.id, 4),
          y: cy + ring * Math.sin(angle) + jitter(node.id + "y", 4),
        });
      });
    }

    // Halo — discoverable
    const haloR = maxR * 0.95;
    discoverable.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / Math.max(discoverable.length, 1) - Math.PI / 2;
      positioned.push({
        ...node,
        x: cx + haloR * Math.cos(angle) + jitter(node.id, 3),
        y: cy + haloR * Math.sin(angle) + jitter(node.id + "y", 3),
      });
    });

    // Re-map links to positioned nodes
    const posMap = new Map(positioned.map(n => [n.id, n]));
    const posLinks: PositionedLink[] = links
      .map(l => ({
        ...l,
        source: posMap.get(l.source.id)!,
        target: posMap.get(l.target.id)!,
      }))
      .filter(l => l.source && l.target);

    return { nodes: positioned, links: posLinks };
  }, [data, filter, dimensions]);

  // D3 render
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;
    svg.selectAll("*").remove();

    const layoutData = filteredData();
    if (!layoutData) return;

    const { nodes, links } = layoutData;
    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) / 2 - 30;

    const g = svg.append("g");

    // ─── Defs ───
    const defs = svg.append("defs");

    // Gradients
    const grads: [string, string, string][] = [
      ["radialHighAffinity", "#0d9488", "#14b8a6"],
      ["radialStrategic", "#f59e0b", "#fbbf24"],
      ["radialNeutral", "#0891b2", "#06b6d4"],
      ["radialDiscoverable", "#8b5cf6", "#a78bfa"],
    ];
    grads.forEach(([id, c1, c2]) => {
      const grad = defs.append("linearGradient").attr("id", id)
        .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
      grad.append("stop").attr("offset", "0%").attr("stop-color", c1);
      grad.append("stop").attr("offset", "100%").attr("stop-color", c2);
    });

    // Glow filter for center node
    const glow = defs.append("filter").attr("id", "centerGlow")
      .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "6").attr("result", "blur");
    glow.append("feFlood").attr("flood-color", "#06b6d4").attr("flood-opacity", "0.4").attr("result", "color");
    glow.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "glow");
    const glowMerge = glow.append("feMerge");
    glowMerge.append("feMergeNode").attr("in", "glow");
    glowMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Selection glow
    const selGlow = defs.append("filter").attr("id", "selectedGlow")
      .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    selGlow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    selGlow.append("feFlood").attr("flood-color", "#22d3ee").attr("flood-opacity", "0.6").attr("result", "color");
    selGlow.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "glow");
    const selMerge = selGlow.append("feMerge");
    selMerge.append("feMergeNode").attr("in", "glow");
    selMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Photo patterns
    nodes.filter(n => n.photoUrl).forEach(n => {
      const r = getNodeRadius(n);
      const patternId = `radial-img-${n.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const pattern = defs.append("pattern").attr("id", patternId)
        .attr("patternUnits", "objectBoundingBox").attr("width", 1).attr("height", 1);
      pattern.append("image").attr("href", n.photoUrl!)
        .attr("width", r * 2).attr("height", r * 2)
        .attr("x", 0).attr("y", 0)
        .attr("preserveAspectRatio", "xMidYMid slice");
    });

    // ─── Orbit rings ───
    const orbitGroup = g.append("g").attr("class", "orbits");
    const highAffinityNodes = nodes.filter(n => n.matchType === "high-affinity");
    const strategicNodes = nodes.filter(n => n.matchType === "strategic");

    // Determine ring radii (must match layout logic above)
    const ringRadii: { r: number; color: string; dash: string }[] = [];
    if (highAffinityNodes.length > 0) {
      ringRadii.push({ r: maxR * 0.35, color: "rgba(20,184,166,0.12)", dash: "none" });
    }
    if (strategicNodes.length > 0) {
      if (strategicNodes.length <= 24) {
        ringRadii.push({ r: maxR * 0.72, color: "rgba(245,158,11,0.10)", dash: "none" });
      } else {
        ringRadii.push({ r: maxR * 0.6, color: "rgba(245,158,11,0.08)", dash: "none" });
        ringRadii.push({ r: maxR * 0.82, color: "rgba(245,158,11,0.08)", dash: "none" });
      }
    }

    ringRadii.forEach(({ r, color, dash }) => {
      orbitGroup.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", r)
        .attr("fill", "none").attr("stroke", color)
        .attr("stroke-width", 1).attr("stroke-dasharray", dash || "4,6");
    });

    // ─── Edges ───
    const linkGroup = g.append("g").attr("class", "links");
    const linkSel = linkGroup.selectAll<SVGLineElement, PositionedLink>("line")
      .data(links).join("line")
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
      .attr("stroke", d => d.isDiscoverable ? "#a78bfa" : "rgba(255,255,255,0.12)")
      .attr("stroke-width", d => d.isDiscoverable ? 1.5 : Math.max(0.5, d.strength * 2.5))
      .attr("stroke-dasharray", d => d.isDiscoverable ? "4,4" : "none")
      .attr("opacity", 0);

    // ─── Nodes ───
    const nodeGroup = g.append("g").attr("class", "nodes");
    const nodeSel = nodeGroup.selectAll<SVGGElement, PositionedNode>("g")
      .data(nodes).join("g")
      .attr("transform", d => d.matchType === "neutral" ? `translate(${d.x},${d.y})` : `translate(${cx},${cy})`)
      .attr("cursor", "pointer")
      .attr("opacity", d => d.matchType === "neutral" ? 1 : 0);

    // Circles
    const circles = nodeSel.append("circle")
      .attr("r", d => getNodeRadius(d))
      .attr("fill", d => getNodeFill(d))
      .attr("stroke", d => d.photoUrl ? getStrokeColor(d.matchType) : "rgba(255,255,255,0.25)")
      .attr("stroke-width", d => d.photoUrl ? 2.5 : 1.5)
      .style("filter", d => d.matchType === "neutral" ? "url(#centerGlow)" : "drop-shadow(0 2px 4px rgba(0,0,0,0.4))");

    // Initials (for nodes without photos)
    nodeSel.filter(d => !d.photoUrl).append("text")
      .attr("dy", "0.35em").attr("text-anchor", "middle")
      .attr("font-size", d => Math.max(9, getNodeRadius(d) * 0.55) + "px")
      .attr("font-weight", "bold")
      .attr("fill", d => d.matchType === "neutral" ? "#000" : "#000")
      .attr("pointer-events", "none")
      .text(d => getInitials(d.name));

    // Name labels — first name only on mobile
    const nameLabels = nodeSel.append("text")
      .attr("dy", d => getNodeRadius(d) + 13)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-weight", "500")
      .attr("fill", "rgba(255,255,255,0.8)")
      .attr("pointer-events", "none")
      .text(d => {
        if (d.matchType === "neutral") return "You";
        return d.name.split(" ")[0];
      });

    // ─── Entrance animation ───
    // Nodes fly outward from center with stagger
    nodeSel.filter(d => d.matchType !== "neutral")
      .transition()
      .duration(700)
      .delay((d, i) => {
        // High-affinity first, then strategic, then discoverable
        const typeOrder = d.matchType === "high-affinity" ? 0 : d.matchType === "strategic" ? 1 : 2;
        return typeOrder * 150 + i * 15;
      })
      .ease(d3.easeCubicOut)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("opacity", 1);

    // Edges fade in after nodes
    linkSel.transition()
      .duration(400)
      .delay(500)
      .attr("opacity", d => d.isDiscoverable ? 0.5 : 0.6);

    // ─── Touch / click handling ───
    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    let lastTapNodeId: string | null = null;

    nodeSel.on("click", function (event, d) {
      event.stopPropagation();

      if (lastTapNodeId === d.id && tapTimer) {
        // Double tap
        clearTimeout(tapTimer);
        tapTimer = null;
        lastTapNodeId = null;
        if (d.matchType !== "neutral" && d.matchType !== "discoverable") {
          onNodeDoubleClickRef.current?.(d);
        }
      } else {
        if (tapTimer) clearTimeout(tapTimer);
        lastTapNodeId = d.id;
        tapTimer = setTimeout(() => {
          tapTimer = null;
          lastTapNodeId = null;
          // Single tap — select
          if (d.matchType === "neutral") return;
          const newId = selectedNodeIdRef.current === d.id ? null : d.id;
          setInternalSelectedNodeId(newId);
          onNodeClickRef.current?.(d);
        }, 250);
      }
    });

    // Background tap to deselect
    svg.on("click", () => {
      setInternalSelectedNodeId(null);
    });

    // ─── Zoom ───
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });
    svg.call(zoom);
    svg.on("dblclick.zoom", null); // disable double-click zoom

    // Store refs for highlight updates
    linkSelRef.current = linkSel;
    circleSelRef.current = circles;
    nameLabelSelRef.current = nameLabels;
    nodesDataRef.current = nodes;
    linksDataRef.current = links;

    return () => {
      if (tapTimer) clearTimeout(tapTimer);
      linkSelRef.current = null;
      circleSelRef.current = null;
      nameLabelSelRef.current = null;
    };
  }, [filteredData, dimensions]);

  // ─── Refs for highlight ───
  const linkSelRef = useRef<d3.Selection<SVGLineElement, PositionedLink, SVGGElement, unknown> | null>(null);
  const circleSelRef = useRef<d3.Selection<SVGCircleElement, PositionedNode, SVGGElement, unknown> | null>(null);
  const nameLabelSelRef = useRef<d3.Selection<SVGTextElement, PositionedNode, SVGGElement, unknown> | null>(null);
  const nodesDataRef = useRef<PositionedNode[]>([]);
  const linksDataRef = useRef<PositionedLink[]>([]);
  const selectedNodeIdRef = useRef<string | null>(null);

  // Sync ref
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId ?? null; }, [selectedNodeId]);

  // Highlight effect
  useEffect(() => {
    const linkSel = linkSelRef.current;
    const circleSel = circleSelRef.current;
    const nameLabels = nameLabelSelRef.current;
    if (!linkSel || !circleSel || !nameLabels) return;

    const links = linksDataRef.current;

    if (!selectedNodeId) {
      // Reset all
      circleSel
        .transition().duration(200)
        .attr("opacity", 1)
        .style("filter", (d) => d.matchType === "neutral" ? "url(#centerGlow)" : "drop-shadow(0 2px 4px rgba(0,0,0,0.4))");
      linkSel
        .transition().duration(200)
        .attr("stroke", d => d.isDiscoverable ? "#a78bfa" : "rgba(255,255,255,0.12)")
        .attr("stroke-width", d => d.isDiscoverable ? 1.5 : Math.max(0.5, d.strength * 2.5))
        .attr("opacity", d => d.isDiscoverable ? 0.5 : 0.6);
      nameLabels
        .transition().duration(200)
        .attr("fill", "rgba(255,255,255,0.8)");
      return;
    }

    // Find connected node ids
    const connectedIds = new Set<string>();
    connectedIds.add(selectedNodeId);
    links.forEach(l => {
      if (l.source.id === selectedNodeId) connectedIds.add(l.target.id);
      if (l.target.id === selectedNodeId) connectedIds.add(l.source.id);
    });

    // Dim non-connected
    circleSel
      .transition().duration(250)
      .attr("opacity", d => connectedIds.has(d.id) ? 1 : 0.15)
      .style("filter", d => {
        if (d.id === selectedNodeId) return "url(#selectedGlow)";
        if (d.matchType === "neutral") return "url(#centerGlow)";
        return connectedIds.has(d.id) ? "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" : "none";
      });

    linkSel
      .transition().duration(250)
      .attr("opacity", d =>
        (d.source.id === selectedNodeId || d.target.id === selectedNodeId) ? 1 : 0.05
      )
      .attr("stroke", d => {
        if (d.source.id === selectedNodeId || d.target.id === selectedNodeId) {
          return d.isDiscoverable ? "#c4b5fd" : "#22d3ee";
        }
        return d.isDiscoverable ? "#a78bfa" : "rgba(255,255,255,0.12)";
      })
      .attr("stroke-width", d =>
        (d.source.id === selectedNodeId || d.target.id === selectedNodeId)
          ? Math.max(2, d.strength * 4) : Math.max(0.5, d.strength * 2.5)
      );

    nameLabels
      .transition().duration(250)
      .attr("fill", d => connectedIds.has(d.id) ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)");
  }, [selectedNodeId]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[300px] bg-gradient-to-br from-gray-950 via-gray-900 to-black rounded-xl overflow-hidden touch-none"
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="w-full h-full"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}

// ─── Helpers ───

function getNodeRadius(node: PositionedNode | NetworkNode): number {
  if (node.matchType === "neutral") return 26;
  if (node.matchType === "discoverable") return 12;
  // Slightly larger for mobile tap targets
  return Math.min(22, 16 + (node.commonalityCount || 0) * 2);
}

function getNodeColor(matchType: string): string {
  switch (matchType) {
    case "high-affinity": return "url(#radialHighAffinity)";
    case "strategic": return "url(#radialStrategic)";
    case "discoverable": return "url(#radialDiscoverable)";
    default: return "url(#radialNeutral)";
  }
}

function getNodeFill(node: PositionedNode): string {
  if (node.photoUrl) {
    const patternId = `radial-img-${node.id.replace(/[^a-zA-Z0-9]/g, "_")}`;
    return `url(#${patternId})`;
  }
  return getNodeColor(node.matchType);
}

function getStrokeColor(matchType: string): string {
  switch (matchType) {
    case "high-affinity": return "#14b8a6";
    case "strategic": return "#fbbf24";
    case "discoverable": return "#a78bfa";
    default: return "#06b6d4";
  }
}

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
