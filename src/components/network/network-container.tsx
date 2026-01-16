"use client";

import { useState, useEffect } from "react";
import { NetworkGraph } from "./network-graph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
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
} from "lucide-react";
import type { NetworkGraphData, NetworkNode } from "@/types";
import Link from "next/link";
import { MeetingRequestModal } from "@/components/meetings/meeting-request-modal";

interface NetworkInsights {
  totalConnections: number;
  highAffinityCount: number;
  strategicCount: number;
  averageStrength: number;
  strongestCluster: string;
  topCommonality: string;
  recommendation: string;
}

export function NetworkContainer() {
  const { toast } = useToast();
  const [networkData, setNetworkData] = useState<NetworkGraphData | null>(null);
  const [insights, setInsights] = useState<NetworkInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "high-affinity" | "strategic">("all");
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

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

  function handleNodeClick(node: NetworkNode) {
    if (node.matchType === "neutral") return; // Don't select self
    setSelectedNode(node);
  }

  function handleNodeHover(node: NetworkNode | null) {
    setHoveredNode(node);
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
            <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400">
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
      <div className="flex-1 flex flex-col p-4">
        {/* Controls bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-cyan-400" />
              <h1 className="text-lg font-semibold text-white">My Network Map</h1>
            </div>

            {/* Filter select */}
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/20">
                <SelectItem value="all" className="text-white hover:bg-white/10">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Connections
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

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-500 to-teal-400" />
              <span className="text-white/60">High-Affinity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-400" />
              <span className="text-white/60">Strategic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400" />
              <span className="text-white/60">You</span>
            </div>
          </div>
        </div>

        {/* Graph visualization */}
        <div className="flex-1 rounded-xl border border-white/10 overflow-hidden relative">
          <NetworkGraph
            data={networkData}
            filter={filter}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
          />

          {/* Hover tooltip */}
          {hoveredNode && hoveredNode.matchType !== "neutral" && (
            <div className="absolute bottom-4 left-4 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-white/20 max-w-xs animate-fade-in">
              <p className="font-semibold text-white">{hoveredNode.name}</p>
              <p className="text-sm text-white/60">{hoveredNode.title}</p>
              {hoveredNode.company && (
                <p className="text-sm text-cyan-400">{hoveredNode.company}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {hoveredNode.commonalities.slice(0, 3).map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs bg-white/10 text-white/80 border-white/20">
                    {c}
                  </Badge>
                ))}
                {hoveredNode.commonalities.length > 3 && (
                  <Badge variant="secondary" className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    +{hoveredNode.commonalities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute top-4 right-4 text-xs text-white/50 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
            <p>🖱️ Click node to view • Drag to move • Scroll to zoom</p>
          </div>
        </div>
      </div>

      {/* Insights sidebar */}
      <aside className="w-80 border-l border-white/10 bg-black/50 p-4 flex flex-col gap-4 overflow-y-auto">
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
                    "mb-2",
                    selectedNode.matchType === "high-affinity"
                      ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  )}
                >
                  {selectedNode.matchType === "high-affinity" ? (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      High-Affinity Match
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
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

              <div className="flex gap-2">
                <Link href={`/user/${selectedNode.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-white/20 text-white hover:bg-white/10">
                    View Profile
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="flex-1 gap-1 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400"
                  onClick={() => setShowMeetingModal(true)}
                >
                  <Calendar className="h-4 w-4" />
                  Meet
                </Button>
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
                      className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
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

      {/* Meeting Request Modal */}
      {selectedNode && (
        <MeetingRequestModal
          open={showMeetingModal}
          onOpenChange={setShowMeetingModal}
          recipient={{
            id: selectedNode.id,
            profile: {
              name: selectedNode.name,
              position: selectedNode.title,
              title: selectedNode.title,
              company: selectedNode.company,
            },
            questionnaireCompleted: true,
          }}
          commonalities={selectedNode.commonalities.map(c => ({
            category: "professional" as const,
            description: c,
            weight: 0.8,
          }))}
        />
      )}
    </div>
  );
}
