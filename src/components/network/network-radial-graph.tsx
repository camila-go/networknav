"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { NetworkGraphData, NetworkNode } from "@/types";

interface NetworkRadialGraphProps {
  data: NetworkGraphData | null;
  onNodeClick?: (node: NetworkNode) => void;
  onNodeDoubleClick?: (node: NetworkNode) => void;
  filter?: "all" | "high-affinity" | "strategic";
  selectedNodeId?: string;
}

// Extend for D3 simulation
interface SimNode extends NetworkNode, d3.SimulationNodeDatum {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  strength: number;
  isDiscoverable?: boolean;
}

// D3 selection type aliases
type LinkSel = d3.Selection<SVGLineElement, SimLink, SVGGElement, unknown>;
type CircleSel = d3.Selection<SVGCircleElement, SimNode, SVGGElement, unknown>;
type TextSel = d3.Selection<SVGTextElement, SimNode, SVGGElement, unknown>;

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

  // Selection refs for highlight updates without simulation rebuild
  const linkSelRef = useRef<LinkSel | null>(null);
  const circleSelRef = useRef<CircleSel | null>(null);
  const nameLabelSelRef = useRef<TextSel | null>(null);
  const initialsSelRef = useRef<TextSel | null>(null);
  const linksDataRef = useRef<SimLink[]>([]);
  const nodeStrengthRef = useRef<Map<string, number>>(new Map());
  const selectedNodeIdRef = useRef<string | null>(null);

  useEffect(() => { selectedNodeIdRef.current = selectedNodeId ?? null; }, [selectedNodeId]);

  // Resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      const r = container.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setDimensions({ width: Math.max(300, r.width), height: Math.max(300, r.height) });
      }
    };
    measure();
    const onResize = () => { clearTimeout(timer); timer = setTimeout(measure, 100); };
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(timer); };
  }, []);

  // ─── Main D3 render ───
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || !data) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) / 2 - 24;

    // ── Filter nodes ──
    let filteredNodes = data.nodes;
    if (filter !== "all") {
      filteredNodes = filteredNodes.filter(
        n => n.matchType === "neutral" || n.matchType === filter || n.matchType === "discoverable"
      );
    }

    // Clone for simulation (D3 mutates them)
    const nodes: SimNode[] = filteredNodes.map(n => ({ ...n }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Build links
    const nodeIds = new Set(nodes.map(n => n.id));
    const links: SimLink[] = data.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({
        source: e.source,
        target: e.target,
        strength: e.strength,
        isDiscoverable:
          nodeMap.get(e.target)?.matchType === "discoverable" ||
          nodeMap.get(e.source)?.matchType === "discoverable",
      }));

    // ── Radii per type ──
    const innerR = maxR * 0.42;
    const outerR = maxR * 0.72;
    const haloR = maxR * 0.93;

    function targetRadius(d: SimNode): number {
      if (d.matchType === "neutral") return 0;
      if (d.matchType === "high-affinity") return innerR;
      if (d.matchType === "discoverable") return haloR;
      return outerR;
    }

    // Pin center node
    const centerNode = nodes.find(n => n.matchType === "neutral");
    if (centerNode) { centerNode.fx = cx; centerNode.fy = cy; }

    // ── Force simulation ──
    const simulation = d3.forceSimulation<SimNode>(nodes)
      .alphaDecay(0.04)
      .alphaMin(0.005)
      .velocityDecay(0.35)
      .force("radial", d3.forceRadial<SimNode>(d => targetRadius(d), cx, cy).strength(0.8))
      .force("collision", d3.forceCollide<SimNode>().radius(d => nodeRadius(d) + 3).strength(0.9))
      .force("link", d3.forceLink<SimNode, SimLink>(links)
        .id(d => d.id)
        .distance(d => d.isDiscoverable ? haloR * 0.3 : targetRadius(d.target as SimNode))
        .strength(0.05) // Very weak — radial force dominates
      );

    // ── Defs ──
    const defs = svg.append("defs");

    // Gradients
    const grads: [string, string, string][] = [
      ["radialHA", "#0d9488", "#14b8a6"],
      ["radialST", "#f59e0b", "#fbbf24"],
      ["radialYOU", "#0891b2", "#06b6d4"],
      ["radialDISC", "#8b5cf6", "#a78bfa"],
    ];
    grads.forEach(([id, c1, c2]) => {
      const g = defs.append("linearGradient").attr("id", id)
        .attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
      g.append("stop").attr("offset", "0%").attr("stop-color", c1);
      g.append("stop").attr("offset", "100%").attr("stop-color", c2);
    });

    // Center glow
    const glow = defs.append("filter").attr("id", "centerGlow")
      .attr("x", "-60%").attr("y", "-60%").attr("width", "220%").attr("height", "220%");
    glow.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
    glow.append("feFlood").attr("flood-color", "#06b6d4").attr("flood-opacity", "0.35").attr("result", "color");
    glow.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "glow");
    const gm = glow.append("feMerge");
    gm.append("feMergeNode").attr("in", "glow");
    gm.append("feMergeNode").attr("in", "SourceGraphic");

    // Selection glow
    const sg = defs.append("filter").attr("id", "selGlow")
      .attr("x", "-80%").attr("y", "-80%").attr("width", "260%").attr("height", "260%");
    sg.append("feGaussianBlur").attr("stdDeviation", "5").attr("result", "blur");
    sg.append("feFlood").attr("flood-color", "#22d3ee").attr("flood-opacity", "0.7").attr("result", "color");
    sg.append("feComposite").attr("in", "color").attr("in2", "blur").attr("operator", "in").attr("result", "glow");
    const sm = sg.append("feMerge");
    sm.append("feMergeNode").attr("in", "glow");
    sm.append("feMergeNode").attr("in", "SourceGraphic");

    // Photo patterns
    nodes.filter(n => n.photoUrl).forEach(n => {
      const r = nodeRadius(n);
      const pid = patternId(n.id);
      const pat = defs.append("pattern").attr("id", pid)
        .attr("patternUnits", "objectBoundingBox").attr("width", 1).attr("height", 1);
      pat.append("image").attr("href", n.photoUrl!)
        .attr("width", r * 2).attr("height", r * 2)
        .attr("preserveAspectRatio", "xMidYMid slice");
    });

    // ── Main group (zoom target) ──
    const g = svg.append("g");

    // ── Orbit guide rings ──
    const orbits = g.append("g");
    [
      { r: innerR, color: "rgba(20,184,166,0.15)" },
      { r: outerR, color: "rgba(245,158,11,0.10)" },
    ].forEach(({ r, color }) => {
      orbits.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", r)
        .attr("fill", "none").attr("stroke", color)
        .attr("stroke-width", 1).attr("stroke-dasharray", "3,5");
    });

    // ── Links ──
    const linkGroup = g.append("g");
    const linkSel = linkGroup.selectAll<SVGLineElement, SimLink>("line")
      .data(links).join("line")
      .attr("stroke", d => d.isDiscoverable ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.06)")
      .attr("stroke-width", d => d.isDiscoverable ? 0.8 : Math.max(0.3, d.strength * 1.5))
      .attr("stroke-dasharray", d => d.isDiscoverable ? "3,3" : "none");

    // ── Node groups ──
    const nodeGroup = g.append("g");
    const nodeSel = nodeGroup.selectAll<SVGGElement, SimNode>("g")
      .data(nodes).join("g")
      .attr("cursor", "pointer");

    // Invisible larger hit area for touch
    nodeSel.append("circle")
      .attr("r", d => Math.max(20, nodeRadius(d) + 8))
      .attr("fill", "transparent")
      .attr("stroke", "none");

    // Build per-node strength map for opacity variation
    const nodeStrength = new Map<string, number>();
    links.forEach(l => {
      const sId = typeof l.source === "string" ? l.source : l.source.id;
      const tId = typeof l.target === "string" ? l.target : l.target.id;
      nodeStrength.set(sId, Math.max(nodeStrength.get(sId) ?? 0, l.strength));
      nodeStrength.set(tId, Math.max(nodeStrength.get(tId) ?? 0, l.strength));
    });

    // Visible circles
    const circles = nodeSel.append("circle")
      .attr("r", d => nodeRadius(d))
      .attr("fill", d => nodeFill(d))
      .attr("stroke", d => d.photoUrl ? strokeColor(d.matchType) : "rgba(255,255,255,0.2)")
      .attr("stroke-width", d => {
        if (d.matchType === "neutral") return 2;
        return d.photoUrl ? 2 : 1;
      })
      .attr("opacity", d => {
        if (d.matchType === "strategic") {
          // Vary opacity by match strength: 0.55–0.95
          const s = nodeStrength.get(d.id) ?? 0.5;
          return 0.55 + s * 0.4;
        }
        return 1;
      })
      .style("filter", d => d.matchType === "neutral" ? "url(#centerGlow)" : "none");

    // Initials — only for center + high-affinity (strategic too small)
    const initials = nodeSel.filter(d => !d.photoUrl && (d.matchType === "neutral" || d.matchType === "high-affinity"))
      .append("text")
      .attr("dy", "0.35em").attr("text-anchor", "middle")
      .attr("font-size", d => d.matchType === "neutral" ? "11px" : "8px")
      .attr("font-weight", "700")
      .attr("fill", "#000")
      .attr("pointer-events", "none")
      .text(d => getInitials(d.name));

    // Labels — high-affinity first names only (center has no label, strategic hidden)
    const nameLabels = nodeSel.append("text")
      .attr("dy", d => nodeRadius(d) + 11)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("font-weight", "500")
      .attr("fill", d => {
        if (d.matchType === "high-affinity") return "rgba(255,255,255,0.85)";
        return "rgba(255,255,255,0)"; // Hidden for center/strategic/discoverable
      })
      .style("text-shadow", "0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.7)")
      .attr("pointer-events", "none")
      .text(d => firstName(d.name));

    // Store refs
    linkSelRef.current = linkSel;
    circleSelRef.current = circles;
    nameLabelSelRef.current = nameLabels;
    initialsSelRef.current = initials;
    linksDataRef.current = links;
    nodeStrengthRef.current = nodeStrength;

    // ── Tick ──
    simulation.on("tick", () => {
      linkSel
        .attr("x1", d => (d.source as SimNode).x!)
        .attr("y1", d => (d.source as SimNode).y!)
        .attr("x2", d => (d.target as SimNode).x!)
        .attr("y2", d => (d.target as SimNode).y!);
      nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // ── Touch / click ──
    let tapTimer: ReturnType<typeof setTimeout> | null = null;
    let lastTapNodeId: string | null = null;

    nodeSel.on("click", function (event, d) {
      event.stopPropagation();
      if (lastTapNodeId === d.id && tapTimer) {
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
          if (d.matchType === "neutral") return;
          const newId = selectedNodeIdRef.current === d.id ? null : d.id;
          setInternalSelectedNodeId(newId);
          onNodeClickRef.current?.(d);
        }, 250);
      }
    });

    svg.on("click", () => setInternalSelectedNodeId(null));

    // ── Zoom (pinch + pan) ──
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
    svg.on("dblclick.zoom", null);

    // Re-apply highlight if a node was already selected
    if (selectedNodeIdRef.current) {
      applyHighlight(selectedNodeIdRef.current);
    }

    return () => {
      simulation.stop();
      if (tapTimer) clearTimeout(tapTimer);
      linkSelRef.current = null;
      circleSelRef.current = null;
      nameLabelSelRef.current = null;
      initialsSelRef.current = null;
    };
  }, [data, dimensions, filter]);

  // ── Highlight helper ──
  function applyHighlight(selId: string | null) {
    const linkSel = linkSelRef.current;
    const circleSel = circleSelRef.current;
    const nameLabels = nameLabelSelRef.current;
    if (!linkSel || !circleSel || !nameLabels) return;

    const links = linksDataRef.current;

    if (!selId) {
      // Reset — restore per-type opacity
      circleSel.transition().duration(200)
        .attr("opacity", d => {
          if (d.matchType === "strategic") {
            const s = nodeStrengthRef.current.get(d.id) ?? 0.5;
            return 0.55 + s * 0.4;
          }
          return 1;
        })
        .style("filter", d => d.matchType === "neutral" ? "url(#centerGlow)" : "none");
      linkSel.transition().duration(200)
        .attr("stroke", d => d.isDiscoverable ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.06)")
        .attr("stroke-width", d => d.isDiscoverable ? 0.8 : Math.max(0.3, d.strength * 1.5));
      nameLabels.transition().duration(200)
        .attr("fill", d => {
          if (d.matchType === "high-affinity") return "rgba(255,255,255,0.85)";
          return "rgba(255,255,255,0)";
        });
      return;
    }

    const connectedIds = new Set<string>([selId]);
    links.forEach(l => {
      const sId = typeof l.source === "string" ? l.source : (l.source as SimNode).id;
      const tId = typeof l.target === "string" ? l.target : (l.target as SimNode).id;
      if (sId === selId) connectedIds.add(tId);
      if (tId === selId) connectedIds.add(sId);
    });

    circleSel.transition().duration(250)
      .attr("opacity", d => connectedIds.has(d.id) ? 1 : 0.12)
      .style("filter", d => {
        if (d.id === selId) return "url(#selGlow)";
        if (d.matchType === "neutral") return "url(#centerGlow)";
        return "none";
      });

    linkSel.transition().duration(250)
      .attr("stroke", d => {
        const sId = typeof d.source === "string" ? d.source : (d.source as SimNode).id;
        const tId = typeof d.target === "string" ? d.target : (d.target as SimNode).id;
        if (sId === selId || tId === selId) return d.isDiscoverable ? "#c4b5fd" : "#22d3ee";
        return "rgba(255,255,255,0.02)";
      })
      .attr("stroke-width", d => {
        const sId = typeof d.source === "string" ? d.source : (d.source as SimNode).id;
        const tId = typeof d.target === "string" ? d.target : (d.target as SimNode).id;
        if (sId === selId || tId === selId) return Math.max(1.5, d.strength * 3);
        return Math.max(0.3, d.strength * 1.5);
      });

    // Show names for connected nodes, hide others (center stays unlabeled)
    nameLabels.transition().duration(250)
      .attr("fill", d => {
        if (d.matchType === "neutral") return "rgba(255,255,255,0)";
        if (connectedIds.has(d.id)) return "rgba(255,255,255,0.95)";
        return "rgba(255,255,255,0)";
      });
  }

  // Highlight effect on selection change
  useEffect(() => {
    applyHighlight(selectedNodeId ?? null);
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

function nodeRadius(node: NetworkNode): number {
  if (node.matchType === "neutral") return 22;
  if (node.matchType === "high-affinity") return 12;
  if (node.matchType === "discoverable") return 5;
  // Strategic — small dots
  return 7;
}

function nodeColor(matchType: string): string {
  switch (matchType) {
    case "high-affinity": return "url(#radialHA)";
    case "strategic": return "url(#radialST)";
    case "discoverable": return "url(#radialDISC)";
    default: return "url(#radialYOU)";
  }
}

function nodeFill(node: NetworkNode): string {
  if (node.photoUrl) return `url(#${patternId(node.id)})`;
  return nodeColor(node.matchType);
}

function strokeColor(matchType: string): string {
  switch (matchType) {
    case "high-affinity": return "#14b8a6";
    case "strategic": return "#fbbf24";
    case "discoverable": return "#a78bfa";
    default: return "#06b6d4";
  }
}

function patternId(id: string): string {
  return `rimg-${id.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function firstName(name: string): string {
  // Handle "First Last", "First.Last", "First_Last"
  return name.split(/[\s._]+/)[0];
}

function getInitials(name: string): string {
  return name.split(/[\s._]+/).map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
