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
  ZoomIn,
  ZoomOut,
  RotateCcw,
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Building your network map...</p>
        </div>
      </div>
    );
  }

  if (!networkData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Network className="h-16 w-16 text-navy-200 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-navy-900 mb-2">No Network Data</h2>
          <p className="text-muted-foreground mb-4">
            Complete your questionnaire to see your network map
          </p>
          <Link href="/onboarding">
            <Button>Complete Questionnaire</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main visualization area */}
      <div className="flex-1 flex flex-col p-4">
        {/* Controls bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold text-navy-900">My Network Map</h1>
            </div>

            {/* Filter select */}
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Connections
                  </span>
                </SelectItem>
                <SelectItem value="high-affinity">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-500" />
                    High-Affinity
                  </span>
                </SelectItem>
                <SelectItem value="strategic">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
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
              <span className="text-muted-foreground">High-Affinity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-amber-500 to-amber-400" />
              <span className="text-muted-foreground">Strategic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-400" />
              <span className="text-muted-foreground">You</span>
            </div>
          </div>
        </div>

        {/* Graph visualization */}
        <div className="flex-1 rounded-xl border bg-white overflow-hidden relative">
          <NetworkGraph
            data={networkData}
            filter={filter}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
          />

          {/* Hover tooltip */}
          {hoveredNode && hoveredNode.matchType !== "neutral" && (
            <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border max-w-xs">
              <p className="font-semibold text-navy-900">{hoveredNode.name}</p>
              <p className="text-sm text-muted-foreground">{hoveredNode.title}</p>
              {hoveredNode.company && (
                <p className="text-sm text-primary">{hoveredNode.company}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {hoveredNode.commonalities.slice(0, 2).map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute top-4 right-4 text-xs text-muted-foreground bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2">
            <p>🖱️ Click node to view • Drag to move • Scroll to zoom</p>
          </div>
        </div>
      </div>

      {/* Insights sidebar */}
      <aside className="w-80 border-l bg-white p-4 flex flex-col gap-4 overflow-y-auto">
        {/* Selected node panel */}
        {selectedNode ? (
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Selected Connection
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={cn(
                    "text-white",
                    selectedNode.matchType === "high-affinity"
                      ? "bg-gradient-to-br from-teal-500 to-teal-400"
                      : "bg-gradient-to-br from-amber-500 to-amber-400"
                  )}>
                    {selectedNode.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-navy-900">{selectedNode.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedNode.title}</p>
                  {selectedNode.company && (
                    <p className="text-sm text-primary">{selectedNode.company}</p>
                  )}
                </div>
              </div>

              <div>
                <Badge
                  className={cn(
                    "mb-2",
                    selectedNode.matchType === "high-affinity"
                      ? "bg-teal-100 text-teal-700"
                      : "bg-amber-100 text-amber-700"
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

                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {selectedNode.commonalityCount} commonalities
                </p>
                <ul className="space-y-1">
                  {selectedNode.commonalities.map((c, i) => (
                    <li key={i} className="text-sm text-navy-700 flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                <Link href={`/user/${selectedNode.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    View Profile
                  </Button>
                </Link>
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => setShowMeetingModal(true)}
                >
                  <Calendar className="h-4 w-4" />
                  Meet
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Network className="h-8 w-8 text-navy-200 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Click a node to view details
              </p>
            </CardContent>
          </Card>
        )}

        {/* Insights */}
        {insights && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Network Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Connections</span>
                  <span className="font-semibold text-navy-900">{insights.totalConnections}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-teal-500" />
                    High-Affinity
                  </span>
                  <span className="font-semibold text-teal-600">{insights.highAffinityCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-500" />
                    Strategic
                  </span>
                  <span className="font-semibold text-amber-600">{insights.strategicCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. Match Strength</span>
                  <span className="font-semibold text-navy-900">{insights.averageStrength}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Strongest Cluster</p>
                  <p className="text-sm text-navy-900">{insights.strongestCluster}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Most Common Link</p>
                  <p className="text-sm text-navy-900">{insights.topCommonality}</p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-xs font-medium text-primary mb-1">💡 Recommendation</p>
                  <p className="text-sm text-navy-700">{insights.recommendation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Clusters */}
            {networkData?.clusters && networkData.clusters.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Clusters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {networkData.clusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="p-2 rounded-lg border hover:bg-navy-50 transition-colors"
                    >
                      <p className="font-medium text-sm text-navy-900">{cluster.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cluster.nodeIds.length} connections • {cluster.theme}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
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



