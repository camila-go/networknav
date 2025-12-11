import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users, questionnaireResponses, connections, userMatches } from "@/lib/stores";
import { cookies } from "next/headers";
import type { NetworkGraphData, NetworkNode, NetworkEdge, NetworkCluster, MatchType } from "@/types";

// Demo user data for the network
const DEMO_USERS = [
  { id: "demo-sarah", name: "Sarah Chen", title: "VP of Engineering", company: "TechCorp", industry: "technology", level: "vp" },
  { id: "demo-marcus", name: "Marcus Johnson", title: "Chief People Officer", company: "GrowthStartup", industry: "technology", level: "c-suite" },
  { id: "demo-elena", name: "Elena Rodriguez", title: "Founder & CEO", company: "InnovateCo", industry: "technology", level: "founder" },
  { id: "demo-david", name: "David Park", title: "VP of Product", company: "ScaleUp Inc", industry: "technology", level: "vp" },
  { id: "demo-aisha", name: "Aisha Patel", title: "CTO", company: "FinanceFlow", industry: "finance", level: "c-suite" },
  { id: "demo-james", name: "James Wilson", title: "Director of Operations", company: "LogiTech Solutions", industry: "manufacturing", level: "director" },
  { id: "demo-lisa", name: "Lisa Thompson", title: "Senior Manager", company: "BrandCo", industry: "media", level: "manager" },
  { id: "demo-michael", name: "Michael Brown", title: "SVP Sales", company: "EnterpriseNow", industry: "consulting", level: "senior-executive" },
];

// Demo commonalities for generating edges
const DEMO_COMMONALITIES: Record<string, Record<string, string[]>> = {
  "demo-sarah": {
    "demo-david": ["Both VPs in tech", "Shared focus on scaling teams", "Both enjoy hiking"],
    "demo-marcus": ["Both focused on culture", "Share servant leadership philosophy"],
    "demo-elena": ["Both in tech startups", "Shared passion for innovation"],
  },
  "demo-marcus": {
    "demo-lisa": ["Both people-focused leaders", "Similar communication styles"],
    "demo-aisha": ["Both focused on organizational transformation"],
  },
  "demo-elena": {
    "demo-aisha": ["Both founders/C-suite", "Both driving innovation"],
    "demo-michael": ["Both focused on growth", "Complementary expertise"],
  },
  "demo-david": {
    "demo-james": ["Both operations-minded", "Shared focus on processes"],
  },
  "demo-aisha": {
    "demo-michael": ["Both in professional services", "Strategic partnership potential"],
  },
  "demo-james": {
    "demo-michael": ["Cross-industry perspective", "Both focused on operational excellence"],
  },
  "demo-lisa": {
    "demo-elena": ["Both creative leaders", "Shared interest in storytelling"],
    "demo-david": ["Both interested in product-market fit"],
  },
};

// Generate network graph data
function generateNetworkData(userId: string): NetworkGraphData {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const clusterMap: Map<string, string[]> = new Map();

  // Add current user as center node (if real user)
  const currentUser = Array.from(users.values()).find(u => u.id === userId);
  if (currentUser) {
    nodes.push({
      id: userId,
      name: currentUser.name,
      title: currentUser.position,
      company: currentUser.company,
      matchType: "neutral",
      commonalityCount: 0,
      commonalities: [],
    });
  } else {
    // Demo user as center
    nodes.push({
      id: userId,
      name: "You",
      title: "Conference Attendee",
      company: undefined,
      matchType: "neutral",
      commonalityCount: 0,
      commonalities: [],
    });
  }

  // Get matches for the user
  const matches = userMatches.get(userId) || [];

  // Add nodes from matches
  for (const match of matches) {
    if (match.passed) continue;

    const matchType: MatchType = match.type;
    const commonalityDescriptions = match.commonalities.map(c => c.description);

    nodes.push({
      id: match.matchedUserId,
      name: match.matchedUser.profile.name,
      title: match.matchedUser.profile.title,
      company: match.matchedUser.profile.company,
      matchType,
      commonalityCount: match.commonalities.length,
      commonalities: commonalityDescriptions,
    });

    edges.push({
      source: userId,
      target: match.matchedUserId,
      strength: match.score,
      commonalities: commonalityDescriptions,
    });

    // Cluster by match type
    const clusterKey = matchType === "high-affinity" ? "high-affinity" : "strategic";
    if (!clusterMap.has(clusterKey)) {
      clusterMap.set(clusterKey, []);
    }
    clusterMap.get(clusterKey)!.push(match.matchedUserId);
  }

  // If no matches, generate demo network
  if (nodes.length === 1) {
    return generateDemoNetwork(userId);
  }

  // Build clusters
  const clusters: NetworkCluster[] = [];
  if (clusterMap.has("high-affinity")) {
    clusters.push({
      id: "high-affinity",
      name: "High-Affinity Matches",
      nodeIds: clusterMap.get("high-affinity")!,
      theme: "Similar backgrounds and shared experiences",
    });
  }
  if (clusterMap.has("strategic")) {
    clusters.push({
      id: "strategic",
      name: "Strategic Connections",
      nodeIds: clusterMap.get("strategic")!,
      theme: "Complementary expertise and growth opportunities",
    });
  }

  return {
    userId,
    nodes,
    edges,
    clusters,
    generatedAt: new Date(),
  };
}

// Generate demo network for testing
function generateDemoNetwork(userId: string): NetworkGraphData {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  // Add center node (user)
  nodes.push({
    id: userId,
    name: "You",
    title: "Conference Attendee",
    company: undefined,
    matchType: "neutral",
    commonalityCount: 0,
    commonalities: [],
  });

  // Add demo user nodes
  const addedNodes = new Set<string>([userId]);
  
  DEMO_USERS.forEach((demoUser, index) => {
    const matchType: MatchType = index % 2 === 0 ? "high-affinity" : "strategic";
    const commonalityCount = Math.floor(Math.random() * 4) + 2;
    
    nodes.push({
      id: demoUser.id,
      name: demoUser.name,
      title: demoUser.title,
      company: demoUser.company,
      matchType,
      commonalityCount,
      commonalities: [
        `Both in ${demoUser.industry}`,
        `Similar leadership level`,
        commonalityCount > 2 ? "Shared networking goals" : "",
        commonalityCount > 3 ? "Common hobbies" : "",
      ].filter(Boolean),
    });
    addedNodes.add(demoUser.id);

    // Edge from user to demo user
    edges.push({
      source: userId,
      target: demoUser.id,
      strength: 0.5 + Math.random() * 0.4,
      commonalities: nodes[nodes.length - 1].commonalities,
    });
  });

  // Add edges between demo users based on DEMO_COMMONALITIES
  for (const [sourceId, targets] of Object.entries(DEMO_COMMONALITIES)) {
    for (const [targetId, commonalities] of Object.entries(targets)) {
      if (addedNodes.has(sourceId) && addedNodes.has(targetId)) {
        edges.push({
          source: sourceId,
          target: targetId,
          strength: 0.3 + commonalities.length * 0.15,
          commonalities,
        });
      }
    }
  }

  // Create clusters by industry
  const techCluster = DEMO_USERS.filter(u => u.industry === "technology").map(u => u.id);
  const otherCluster = DEMO_USERS.filter(u => u.industry !== "technology").map(u => u.id);
  
  const clusters: NetworkCluster[] = [
    {
      id: "tech-leaders",
      name: "Tech Leaders",
      nodeIds: techCluster,
      theme: "Technology industry connections",
    },
    {
      id: "cross-industry",
      name: "Cross-Industry",
      nodeIds: otherCluster,
      theme: "Diverse industry perspectives",
    },
  ];

  return {
    userId,
    nodes,
    edges,
    clusters,
    generatedAt: new Date(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;

    const currentUserId = session?.userId || deviceId || "demo-user";

    const networkData = generateNetworkData(currentUserId);

    // Calculate insights
    const highAffinityCount = networkData.nodes.filter(n => n.matchType === "high-affinity").length;
    const strategicCount = networkData.nodes.filter(n => n.matchType === "strategic").length;
    const totalConnections = networkData.edges.length;
    const avgStrength = totalConnections > 0
      ? networkData.edges.reduce((sum, e) => sum + e.strength, 0) / totalConnections
      : 0;

    // Find strongest cluster
    const strongestCluster = networkData.clusters.reduce(
      (best, cluster) => cluster.nodeIds.length > (best?.nodeIds.length || 0) ? cluster : best,
      networkData.clusters[0]
    );

    // Find most common commonality
    const commonalityCounts: Record<string, number> = {};
    networkData.edges.forEach(edge => {
      edge.commonalities.forEach(c => {
        commonalityCounts[c] = (commonalityCounts[c] || 0) + 1;
      });
    });
    const topCommonality = Object.entries(commonalityCounts)
      .sort(([, a], [, b]) => b - a)[0];

    const insights = {
      totalConnections,
      highAffinityCount,
      strategicCount,
      averageStrength: Math.round(avgStrength * 100),
      strongestCluster: strongestCluster?.name || "None",
      topCommonality: topCommonality?.[0] || "No commonalities yet",
      recommendation: strategicCount < highAffinityCount
        ? "Consider exploring more strategic connections for diverse perspectives"
        : "Great balance! You have strong strategic connections",
    };

    return NextResponse.json({
      success: true,
      data: {
        network: networkData,
        insights,
      },
    });
  } catch (error) {
    console.error("Network data error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}



