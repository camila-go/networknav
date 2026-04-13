"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { NetworkGraph } from "./network-graph";
import { NetworkRadialGraph } from "./network-radial-graph";
import { Button, primaryActionClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn, teamsMeetingUrl } from "@/lib/utils";
import {
  Network,
  Sparkles,
  Zap,
  Users,
  TrendingUp,
  Lightbulb,
  X,
  Calendar,
  Loader2,
  MessageCircle,
  Eye,
  UserPlus,
} from "lucide-react";
import type { NetworkGraphData, NetworkNode, NetworkEdge, MatchType } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NetworkInsights {
  totalConnections: number;
  highAffinityCount: number;
  strategicCount: number;
  averageStrength: number;
  strongestCluster: string;
  topCommonality: string;
  recommendation: string;
}

// Type for extended network contacts
interface ExtendedContact {
  id: string;
  name: string;
  title: string;
  company: string;
  reason: string;
}

export function NetworkContainer() {
  const { toast } = useToast();
  const router = useRouter();
  const [networkData, setNetworkData] = useState<NetworkGraphData | null>(null);
  const [insights, setInsights] = useState<NetworkInsights | null>(null);
  const [extendedNetwork, setExtendedNetwork] = useState<Record<string, ExtendedContact[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "high-affinity" | "strategic">("all");
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  useEffect(() => {
    fetchNetworkData();
  }, []);

  async function fetchNetworkData() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/network");
      const result = await response.json();

      if (result.success) {
        setNetworkData(result.data.network);
        setInsights(result.data.insights);
        setExtendedNetwork(result.data.extendedNetwork || {});
      } else {
        toast({
          variant: "destructive",
          title: "Failed to load network",
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Failed to fetch network:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Failed to load network data",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Get discoverable contacts through a selected node
  function getDiscoverableContacts(nodeId: string): ExtendedContact[] {
    return extendedNetwork[nodeId] || [];
  }

  // Get the current user's node (neutral/center node)
  const currentUserNode = useMemo(() => {
    if (!networkData) return null;
    return networkData.nodes.find(n => n.matchType === "neutral");
  }, [networkData]);

  // Get your connections (people you match with)
  const yourConnectionIds = useMemo(() => {
    if (!networkData || !currentUserNode) return new Set<string>();
    const ids = new Set<string>();
    networkData.edges.forEach(edge => {
      if (edge.source === currentUserNode.id) ids.add(edge.target as string);
      if (edge.target === currentUserNode.id) ids.add(edge.source as string);
    });
    return ids;
  }, [networkData, currentUserNode]);

  // Get mutual connections - people that both you AND the selected person are connected to
  const getMutualConnections = useMemo(() => {
    if (!networkData) return () => [];
    
    return (nodeId: string): NetworkNode[] => {
      // Get selected person's connections
      const theirConnectionIds = new Set<string>();
      networkData.edges.forEach(edge => {
        if (edge.source === nodeId) theirConnectionIds.add(edge.target as string);
        if (edge.target === nodeId) theirConnectionIds.add(edge.source as string);
      });
      
      // Find intersection: people connected to both you and them
      const mutualIds = new Set<string>();
      theirConnectionIds.forEach(id => {
        if (yourConnectionIds.has(id) && id !== nodeId) {
          mutualIds.add(id);
        }
      });
      
      return networkData.nodes
        .filter(n => mutualIds.has(n.id) && n.matchType !== "neutral")
        .slice(0, 3);
    };
  }, [networkData, yourConnectionIds]);

  // Enhanced network data with discoverable contacts shown as purple nodes on the graph
  const enhancedNetworkData = useMemo(() => {
    if (!networkData) return null;

    const existingNodeIds = new Set(networkData.nodes.map(n => n.id));
    let newNodes: NetworkNode[] = [];
    let newEdges: NetworkEdge[] = [];

    if (selectedNode && selectedNode.matchType !== "neutral") {
      // When a node is selected, show its discoverable contacts
      const contacts = getDiscoverableContacts(selectedNode.id);
      newNodes = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        title: contact.title,
        company: contact.company,
        matchType: "discoverable" as MatchType,
        commonalityCount: 0,
        commonalities: [contact.reason],
      }));
      newEdges = contacts.map(contact => ({
        source: selectedNode.id,
        target: contact.id,
        strength: 0.5,
        commonalities: [contact.reason],
      }));
    } else {
      // When no node selected, show a few discoverable nodes by default
      const sampleNodes = networkData.nodes
        .filter(n => n.matchType !== "neutral" && extendedNetwork[n.id]?.length > 0)
        .slice(0, 3);

      for (const node of sampleNodes) {
        const contact = extendedNetwork[node.id]?.[0];
        if (contact && !existingNodeIds.has(contact.id)) {
          newNodes.push({
            id: contact.id,
            name: contact.name,
            title: contact.title,
            company: contact.company,
            matchType: "discoverable" as MatchType,
            commonalityCount: 0,
            commonalities: [contact.reason],
          });
          newEdges.push({
            source: node.id,
            target: contact.id,
            strength: 0.5,
            commonalities: [contact.reason],
          });
        }
      }
    }

    // Filter out any nodes that already exist
    const uniqueNewNodes = newNodes.filter(n => !existingNodeIds.has(n.id));
    const allNodeIds = new Set([...existingNodeIds, ...uniqueNewNodes.map(n => n.id)]);
    const uniqueNewEdges = newEdges.filter(e => allNodeIds.has(e.target as string) && !existingNodeIds.has(e.target as string));

    if (uniqueNewNodes.length === 0) return networkData;

    return {
      ...networkData,
      nodes: [...networkData.nodes, ...uniqueNewNodes],
      edges: [...networkData.edges, ...uniqueNewEdges],
    };
  }, [networkData, selectedNode, extendedNetwork]);

  // Filter nodes for mobile list view
  const filteredNodes = useMemo(() => {
    if (!networkData) return [];
    return networkData.nodes.filter(node => {
      if (node.matchType === "neutral") return false;
      if (filter === "all") return true;
      return node.matchType === filter;
    });
  }, [networkData, filter]);

  // Flattened discoverable contacts for the "People You Could Meet" section
  const discoverableContacts = useMemo(() => {
    const seen = new Set<string>();
    const contacts: (ExtendedContact & { bridgeName: string })[] = [];

    for (const [nodeId, contactList] of Object.entries(extendedNetwork)) {
      const bridgeNode = networkData?.nodes.find(n => n.id === nodeId);
      if (!bridgeNode) continue;
      for (const contact of contactList) {
        if (!seen.has(contact.id)) {
          seen.add(contact.id);
          contacts.push({ ...contact, bridgeName: bridgeNode.name });
        }
      }
      if (contacts.length >= 12) break;
    }
    return contacts;
  }, [extendedNetwork, networkData]);

  function handleNodeClick(node: NetworkNode) {
    if (node.matchType === "neutral") return;
    
    // Navigate directly to profile for discoverable nodes
    if (node.matchType === "discoverable") {
      router.push(`/user/${node.id}`);
      return;
    }
    
    setSelectedNode(node);
    setShowMobileDetail(true);
  }

  function handleMobileNodeSelect(node: NetworkNode) {
    setSelectedNode(node);
    setShowMobileDetail(true);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white/60">Building your network map...</p>
        </div>
      </div>
    );
  }

  if (!networkData) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <div className="text-center">
          <Network className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No Network Data</h2>
          <p className="text-white/60 mb-4">
            Complete your questionnaire to see your network map
          </p>
          <Link href="/onboarding">
            <Button>
              Complete Questionnaire
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-black">
      {/* Main visualization area */}
      <div className="flex-1 flex flex-col p-4 min-w-0">
        {/* Controls bar */}
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-cyan-400" />
              <h1 className="text-base sm:text-lg font-semibold text-white">My Network</h1>
            </div>

            {/* Filter select */}
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-32 sm:w-40 bg-white/5 border-white/20 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="all" className="text-white hover:bg-white/10">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All
                  </span>
                </SelectItem>
                <SelectItem value="high-affinity" className="text-white hover:bg-white/10">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-400" />
                    High-Affinity
                  </span>
                </SelectItem>
                <SelectItem value="strategic" className="text-white hover:bg-white/10">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Strategic
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            {/* Legend - hidden on mobile */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-teal-500 to-teal-400" />
                <span className="text-white/60">High-Affinity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-amber-400" />
                <span className="text-white/60">Strategic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-violet-500 to-violet-400" />
                <span className="text-white/60">Discoverable</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400" />
                <span className="text-white/60">You</span>
              </div>
            </div>
            
            {/* Mobile sidebar toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMobileSidebar(true)}
              className="lg:hidden border-white/20 text-white/70 hover:text-white hover:bg-white/10"
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Insights</span>
            </Button>
          </div>
        </div>

        {/* Mobile compact legend */}
        <div className="flex md:hidden items-center gap-3 mb-3 text-[11px] px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-teal-500 to-teal-400" />
            <span className="text-white/50">High-Affinity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-amber-500 to-amber-400" />
            <span className="text-white/50">Strategic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400" />
            <span className="text-white/50">You</span>
          </div>
        </div>

        {/* Discoverable contacts - "People You Could Meet" (hidden on mobile — shown in graph) */}
        {discoverableContacts.length > 0 && (
          <div className="hidden md:block mb-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 flex items-center justify-center">
                <Users className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-medium text-white/70">People You Could Meet</span>
              <span className="text-xs text-violet-300/50 ml-auto">{discoverableContacts.length} people</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {discoverableContacts.map(contact => (
                <Link
                  key={contact.id}
                  href={`/user/${contact.id}`}
                  className="flex-shrink-0 w-40 flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-b from-violet-500/10 to-purple-900/20 border border-violet-500/20 hover:border-violet-500/40 hover:bg-violet-500/15 transition-colors"
                >
                  <Avatar className="h-10 w-10 border-2 border-violet-400/30">
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-violet-500 to-purple-500 text-white">
                      {contact.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-white font-medium text-center truncate w-full">
                    {contact.name}
                  </span>
                  <span className="text-[11px] text-white/50 text-center truncate w-full">
                    {contact.title}
                  </span>
                  <span className="text-[10px] text-violet-300/60 text-center truncate w-full">
                    via {contact.bridgeName.split(" ")[0]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mobile radial graph - shown on small screens */}
        <div className="md:hidden flex-1 rounded-xl border border-white/10 overflow-hidden relative">
          <NetworkRadialGraph
            data={networkData}
            filter={filter}
            onNodeClick={(node) => {
              // Single tap — just highlight, no detail sheet
              setSelectedNode(node);
            }}
            onNodeDoubleClick={(node) => {
              // Double tap — open detail sheet
              setSelectedNode(node);
              setShowMobileDetail(true);
            }}
            onDeselect={() => {
              setSelectedNode(null);
              setShowMobileDetail(false);
            }}
            selectedNodeId={selectedNode?.id}
          />
          {/* Mobile interaction hint — always visible, never blocks taps */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-[10px] text-white/50 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
            Tap to highlight &bull; Double-tap for details &bull; Pinch to zoom
          </div>
        </div>

        {/* Graph visualization - hidden on mobile */}
        <div className="hidden md:flex flex-1 rounded-xl border border-white/10 overflow-hidden relative">
          <NetworkGraph
            data={enhancedNetworkData}
            filter={filter}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={(node) => router.push(`/user/${node.id}`)}
            selectedNodeId={selectedNode?.id}
          />

          {/* Instructions */}
          <div className="absolute top-4 right-4 text-xs text-white/50 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 border border-white/10 max-w-[220px]">
            <p>Click to select • Double-click bubble for profile • Drag • Scroll to zoom</p>
          </div>
        </div>
      </div>

      {/* Mobile detail panel - bottom sheet */}
      {showMobileDetail && selectedNode && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowMobileDetail(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl border-t border-white/10 max-h-[85vh] flex flex-col animate-slide-up">
            {/* Handle bar and close button */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
              <div className="w-8" />
              <div className="w-10 h-1 rounded-full bg-white/20" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileDetail(false)}
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
              {/* Header */}
              <Link
                href={`/user/${selectedNode.id}`}
                className="flex items-start gap-3 rounded-xl hover:bg-white/5 -m-1 p-1 transition-colors"
              >
                <Avatar className="h-14 w-14 border-2 border-white/20 shrink-0">
                  <AvatarFallback className={cn(
                    "text-black font-semibold text-lg",
                    selectedNode.matchType === "high-affinity"
                      ? "bg-gradient-to-br from-teal-500 to-teal-400"
                      : "bg-gradient-to-br from-amber-500 to-amber-400"
                  )}>
                    {selectedNode.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg text-white hover:text-cyan-300">{selectedNode.name}</p>
                  <p className="text-sm text-white/60">{selectedNode.title}</p>
                  {selectedNode.company && (
                    <p className="text-sm text-cyan-400">{selectedNode.company}</p>
                  )}
                  <Badge
                    className={cn(
                      "mt-2 gap-1 font-medium border-0",
                      selectedNode.matchType === "high-affinity"
                        ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25"
                        : "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                    )}
                  >
                    {selectedNode.matchType === "high-affinity" ? (
                      <><Sparkles className="h-3 w-3" />High-Affinity</>
                    ) : (
                      <><Zap className="h-3 w-3" />Strategic</>
                    )}
                  </Badge>
                </div>
              </Link>

              {/* Commonalities */}
              {selectedNode.commonalities.length > 0 && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                    What you share
                  </p>
                  <ul className="space-y-1.5">
                    {selectedNode.commonalities.map((c, i) => (
                      <li key={i} className="text-sm text-white/80 flex items-start gap-2">
                        <span className="text-cyan-400">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Discoverable contacts - people you could meet through this person */}
              {getDiscoverableContacts(selectedNode.id).length > 0 && (
                <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl p-3 border border-violet-500/20">
                  <p className="text-xs font-medium text-violet-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Meet through {selectedNode.name.split(" ")[0]}
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {getDiscoverableContacts(selectedNode.id).slice(0, 3).map((contact) => (
                      <Link
                        key={contact.id}
                        href={`/user/${contact.id}`}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-full bg-white/5 border border-violet-500/20 hover:bg-white/10 hover:border-violet-500/40 transition-colors min-w-[90px]"
                      >
                        <Avatar className="h-10 w-10 border border-violet-400/30">
                          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-violet-500 to-purple-500 text-white">
                            {contact.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/80 text-center truncate w-full font-medium">
                          {contact.name.split(" ")[0]}
                        </span>
                        <span className="text-[10px] text-violet-300/60 truncate w-full text-center">
                          {contact.title.split(" ")[0]}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <p className="text-[10px] text-violet-300/50 text-center mt-1">
                    Tap to view profile
                  </p>
                </div>
              )}

              {/* Mutual connections - fallback */}
              {getDiscoverableContacts(selectedNode.id).length === 0 && getMutualConnections(selectedNode.id).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                    You both match with
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {getMutualConnections(selectedNode.id).slice(0, 3).map((conn) => (
                      <button
                        key={conn.id}
                        onClick={() => setSelectedNode(conn)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors min-w-[80px]"
                      >
                        <Avatar className="h-10 w-10 border border-white/20">
                          <AvatarFallback className={cn(
                            "text-black text-xs font-semibold",
                            conn.matchType === "high-affinity"
                              ? "bg-gradient-to-br from-teal-500 to-teal-400"
                              : "bg-gradient-to-br from-amber-500 to-amber-400"
                          )}>
                            {conn.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/80 text-center truncate w-full">
                          {conn.name.split(" ")[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky action buttons at bottom */}
            <div className="shrink-0 border-t border-white/10 px-4 py-3 bg-gray-900">
              <div className="flex gap-2">
                <Link href={`/user/${selectedNode.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
                    View Full Profile
                  </Button>
                </Link>
                <button
                  onClick={() => {
                    window.location.href = `/messages?userId=${selectedNode.id}&name=${encodeURIComponent(selectedNode.name)}`;
                  }}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-full text-sm font-medium text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
                {selectedNode.email ? (
                  <a
                    href={teamsMeetingUrl(selectedNode.email, `Meet: ${selectedNode.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      primaryActionClasses
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    Meet
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      toast({
                        title: "Meet on Teams",
                        description: "Email isn’t available for this member yet. Open their profile to connect.",
                      })
                    }
                    className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-full text-sm font-medium bg-white/10 text-white/70"
                  >
                    <Calendar className="h-4 w-4" />
                    Meet
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setShowMobileSidebar(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-80 max-w-[90vw] bg-gray-900 shadow-xl border-l border-white/10 p-4 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-white">Network Insights</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSidebar(false)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Mobile legend */}
            <div className="flex items-center gap-3 text-xs pb-3 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-teal-500 to-teal-400" />
                <span className="text-white/60">High-Affinity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-500 to-amber-400" />
                <span className="text-white/60">Strategic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400" />
                <span className="text-white/60">You</span>
              </div>
            </div>

            {/* Selected node panel - mobile */}
            {selectedNode ? (
              <div className="rounded-xl bg-white/5 border-2 border-cyan-500/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white/50">
                    Selected Connection
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10"
                    onClick={() => setSelectedNode(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  <Link href={`/user/${selectedNode.id}`} className="flex items-center gap-3 rounded-full hover:bg-white/5 p-1 -m-1">
                    <Avatar className="h-12 w-12 border-2 border-white/20">
                      <AvatarFallback className={cn(
                        "text-black font-semibold",
                        selectedNode.matchType === "high-affinity"
                          ? "bg-gradient-to-br from-teal-500 to-teal-400"
                          : "bg-gradient-to-br from-amber-500 to-amber-400"
                      )}>
                        {selectedNode.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate hover:text-cyan-300">{selectedNode.name}</p>
                      <p className="text-sm text-white/60 truncate">{selectedNode.title}</p>
                      {selectedNode.company && (
                        <p className="text-sm text-cyan-400 truncate">{selectedNode.company}</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex gap-2">
                    <Link href={`/user/${selectedNode.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
                        View Profile
                      </Button>
                    </Link>
                    {selectedNode.email ? (
                      <a
                        href={teamsMeetingUrl(selectedNode.email, `Meet: ${selectedNode.name}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex-1 inline-flex items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-medium",
                          primaryActionClasses
                        )}
                      >
                        <Calendar className="h-4 w-4" />
                        Meet
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1 gap-1 bg-white/10 text-white/70"
                        onClick={() =>
                          toast({
                            title: "Meet on Teams",
                            description: "Email isn’t available for this member yet.",
                          })
                        }
                      >
                        <Calendar className="h-4 w-4" />
                        Meet
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Insights - mobile */}
            {insights && (
              <>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white">Network Stats</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/60">Total Connections</span>
                      <span className="font-semibold text-white">{insights.totalConnections}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/60">High-Affinity</span>
                      <span className="font-semibold text-teal-400">{insights.highAffinityCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/60">Strategic</span>
                      <span className="font-semibold text-amber-400">{insights.strategicCount}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Desktop Insights sidebar */}
      <aside className="hidden lg:flex w-80 border-l border-white/10 bg-black/50 p-4 flex-col gap-4 overflow-y-auto">
        {/* Selected node panel */}
        {selectedNode ? (
          <div className="rounded-xl bg-white/5 border-2 border-cyan-500/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/50">
                Selected Connection
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white/50 hover:text-white hover:bg-white/10"
                onClick={() => setSelectedNode(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white/20">
                  <AvatarFallback className={cn(
                    "text-black font-semibold",
                    selectedNode.matchType === "high-affinity"
                      ? "bg-gradient-to-br from-teal-500 to-teal-400"
                      : "bg-gradient-to-br from-amber-500 to-amber-400"
                  )}>
                    {selectedNode.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">{selectedNode.name}</p>
                  <p className="text-sm text-white/60">{selectedNode.title}</p>
                  {selectedNode.company && (
                    <p className="text-sm text-cyan-400">{selectedNode.company}</p>
                  )}
                </div>
              </div>

              <div>
                <Badge
                  className={cn(
                    "mb-2 gap-1 font-medium border-0",
                    selectedNode.matchType === "high-affinity"
                      ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25"
                      : "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                  )}
                >
                  {selectedNode.matchType === "high-affinity" ? (
                    <>
                      <Sparkles className="h-3 w-3" />
                      High-Affinity Match
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" />
                      Strategic Match
                    </>
                  )}
                </Badge>

                <p className="text-xs font-medium text-white/50 mb-2">
                  {selectedNode.commonalityCount} commonalities
                </p>
                <ul className="space-y-1">
                  {selectedNode.commonalities.map((c, i) => (
                    <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                      <span className="text-cyan-400">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Discoverable contacts - people you could meet through this person */}
              {getDiscoverableContacts(selectedNode.id).length > 0 && (
                <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl p-3 border border-violet-500/20">
                  <p className="text-xs font-medium text-violet-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Discover through {selectedNode.name.split(" ")[0]}
                  </p>
                  <div className="space-y-2">
                    {getDiscoverableContacts(selectedNode.id).slice(0, 3).map((contact) => (
                      <Link
                        key={contact.id}
                        href={`/user/${contact.id}`}
                        className="flex items-start gap-2 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/30 transition-colors"
                      >
                        <Avatar className="h-9 w-9 border border-violet-400/30">
                          <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-violet-500 to-purple-500 text-white">
                            {contact.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{contact.name}</p>
                          <p className="text-xs text-white/60 truncate">{contact.title}</p>
                          <p className="text-xs text-violet-300/70 truncate">{contact.company}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <p className="text-[10px] text-violet-300/50 mt-2 text-center">
                    Click to view profile
                  </p>
                </div>
              )}

              {/* Mutual connections - people you both match with */}
              {getMutualConnections(selectedNode.id).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                    You both match with
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {getMutualConnections(selectedNode.id).map((conn) => (
                      <Link
                        key={conn.id}
                        href={`/user/${conn.id}`}
                        className="flex items-center gap-2 p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <Avatar className="h-8 w-8 border border-white/20">
                          <AvatarFallback className={cn(
                            "text-black text-xs font-semibold",
                            conn.matchType === "high-affinity"
                              ? "bg-gradient-to-br from-teal-500 to-teal-400"
                              : "bg-gradient-to-br from-amber-500 to-amber-400"
                          )}>
                            {conn.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/80">
                          {conn.name.split(" ")[0]}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Link href={`/user/${selectedNode.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
                    View Profile
                  </Button>
                </Link>
                {selectedNode.email ? (
                  <a
                    href={teamsMeetingUrl(selectedNode.email, `Meet: ${selectedNode.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-medium",
                      primaryActionClasses
                    )}
                  >
                    <Calendar className="h-4 w-4" />
                    Meet
                  </a>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1 gap-1 bg-white/10 text-white/70"
                    onClick={() =>
                      toast({
                        title: "Meet on Teams",
                        description: "Email isn’t available for this member yet. Open their profile to connect.",
                      })
                    }
                  >
                    <Calendar className="h-4 w-4" />
                    Meet
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white/5 border border-dashed border-white/20 p-8 text-center">
            <Network className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/50">
              Click a node to view details
            </p>
          </div>
        )}

        {/* Insights */}
        {insights && (
          <>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Network Stats</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Total Connections</span>
                  <span className="font-semibold text-white">{insights.totalConnections}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-teal-400" />
                    High-Affinity
                  </span>
                  <span className="font-semibold text-teal-400">{insights.highAffinityCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" />
                    Strategic
                  </span>
                  <span className="font-semibold text-amber-400">{insights.strategicCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60">Avg. Match Strength</span>
                  <span className="font-semibold text-white">{insights.averageStrength}%</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Insights</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-white/50">Strongest Cluster</p>
                  <p className="text-sm text-white">{insights.strongestCluster}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-white/50">Most Common Link</p>
                  <p className="text-sm text-white">{insights.topCommonality}</p>
                </div>
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-xs font-medium text-cyan-400 mb-1">💡 Recommendation</p>
                  <p className="text-sm text-white/80">{insights.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Clusters */}
            {networkData?.clusters && networkData.clusters.length > 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-white">Clusters</span>
                </div>
                <div className="space-y-2">
                  {networkData.clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="p-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <p className="font-medium text-sm text-white">{cluster.name}</p>
                      <p className="text-xs text-white/50">
                        {cluster.nodeIds.length} connections • {cluster.theme}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </aside>

    </div>
  );
}

// Mobile swipeable cards for network exploration - distinct from match cards
function NetworkMobileCards({
  nodes,
  onNodeSelect,
  onMeet,
  getMutualConnections,
}: {
  nodes: NetworkNode[];
  onNodeSelect: (node: NetworkNode) => void;
  onMeet: (node: NetworkNode) => void;
  getMutualConnections: (nodeId: string) => NetworkNode[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = scrollRef.current.offsetWidth * 0.85 + 16;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, nodes.length - 1));
  };

  if (nodes.length === 0) {
    return (
      <div className="md:hidden flex-1 flex items-center justify-center">
        <div className="text-center py-8">
          <Network className="h-12 w-12 text-cyan-400/30 mx-auto mb-3" />
          <p className="text-white/50">No matches to show</p>
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 flex items-center justify-center">
            <Network className="h-3 w-3 text-white" />
          </div>
          <span className="text-sm font-medium text-white/70">
            Your Matches
          </span>
        </div>
        <span className="text-xs text-white/50">{activeIndex + 1} of {nodes.length}</span>
      </div>

      {/* Swipeable cards */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide scroll-smooth -mx-4 px-4"
      >
        {nodes.map((node) => {
          const mutualConnections = getMutualConnections(node.id);
          
          return (
            <div
              key={node.id}
              className={cn(
                "flex-shrink-0 w-[85vw] max-w-[340px] snap-start overflow-hidden rounded-2xl border",
                node.matchType === "high-affinity"
                  ? "bg-gradient-to-b from-teal-500/10 to-teal-900/20 border-teal-500/20"
                  : "bg-gradient-to-b from-amber-500/10 to-amber-900/20 border-amber-500/20"
              )}
            >
              {/* Person details */}
              <div className="px-4 pt-4 pb-3 text-center">
                <button onClick={() => onNodeSelect(node)} className="mx-auto">
                  <Avatar className={cn(
                    "h-16 w-16 border-2 mx-auto",
                    node.matchType === "high-affinity" ? "border-teal-400/50" : "border-amber-400/50"
                  )}>
                    <AvatarFallback className={cn(
                      "text-lg font-semibold",
                      node.matchType === "high-affinity"
                        ? "bg-gradient-to-br from-teal-500 to-teal-400 text-black"
                        : "bg-gradient-to-br from-amber-500 to-amber-400 text-black"
                    )}>
                      {node.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <Link href={`/user/${node.id}`}>
                  <h3 className="font-semibold text-lg text-white cursor-pointer hover:text-cyan-300 transition-colors mt-2">
                    {node.name}
                  </h3>
                </Link>
                <p className="text-sm text-white/60">{node.title}</p>
                {node.company && (
                  <p className={cn(
                    "text-sm",
                    node.matchType === "high-affinity" ? "text-teal-300" : "text-amber-300"
                  )}>{node.company}</p>
                )}
                <Badge
                  className={cn(
                    "mt-2 gap-1 text-xs font-medium border-0",
                    node.matchType === "high-affinity"
                      ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25"
                      : "bg-gradient-to-r from-amber-600 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                  )}
                >
                  {node.matchType === "high-affinity" ? (
                    <><Sparkles className="h-3 w-3" /> High-Affinity</>
                  ) : (
                    <><Zap className="h-3 w-3" /> Strategic</>
                  )}
                </Badge>
              </div>

              {/* Commonalities */}
              {node.commonalities.length > 0 && (
                <div className="px-4 py-3 border-t border-white/10">
                  <p className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">
                    What you share
                  </p>
                  <p className="text-sm text-white/80">
                    {node.commonalities[0]}
                  </p>
                </div>
              )}

              {/* Mutual connections */}
              {mutualConnections.length > 0 && (
                <div className="px-4 py-3 bg-white/5 border-t border-white/10">
                  <p className="text-[10px] font-medium text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Network className="h-3 w-3" />
                    Mutual ({mutualConnections.length})
                  </p>
                  <div className="flex gap-2">
                    {mutualConnections.slice(0, 3).map((conn) => (
                      <button
                        key={conn.id}
                        onClick={() => onNodeSelect(conn)}
                        className="flex-1 flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <Avatar className="h-8 w-8 border border-white/20">
                          <AvatarFallback className={cn(
                            "text-xs font-semibold text-black",
                            conn.matchType === "high-affinity"
                              ? "bg-gradient-to-br from-teal-500 to-teal-400"
                              : "bg-gradient-to-br from-amber-500 to-amber-400"
                          )}>
                            {conn.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-white/80 font-medium">
                          {conn.name.split(" ")[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className={cn(
                "border-t flex gap-2 p-3",
                node.matchType === "high-affinity"
                  ? "border-teal-500/20 bg-teal-500/5"
                  : "border-amber-500/20 bg-amber-500/5"
              )}>
                <Link
                  href={`/user/${node.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Profile
                </Link>
                <button
                  onClick={() => onMeet(node)}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
                    primaryActionClasses
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination dots */}
      {nodes.length > 1 && nodes.length <= 10 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {nodes.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (scrollRef.current) {
                  const cardWidth = scrollRef.current.offsetWidth * 0.85 + 16;
                  scrollRef.current.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
                }
              }}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex
                  ? 'w-6 bg-cyan-400'
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}