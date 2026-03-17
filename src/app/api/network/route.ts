import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users, questionnaireResponses, userMatches } from "@/lib/stores";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { cache, CACHE_KEYS, CACHE_TTLS } from "@/lib/cache";
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

// Extended network - people each demo user knows (for discovery)
const DEMO_EXTENDED_NETWORK: Record<string, Array<{ id: string; name: string; title: string; company: string; reason: string }>> = {
  "demo-sarah": [
    { id: "ext-rachel", name: "Rachel Kim", title: "VP Engineering", company: "DataFlow", reason: "Former colleague at TechCorp" },
    { id: "ext-alex", name: "Alex Rivera", title: "CTO", company: "CloudFirst", reason: "Met at Tech Leadership Summit" },
    { id: "ext-jordan", name: "Jordan Lee", title: "Director of Platform", company: "StreamTech", reason: "Industry peer group member" },
  ],
  "demo-marcus": [
    { id: "ext-taylor", name: "Taylor Morgan", title: "CHRO", company: "GlobalTech", reason: "HR Leadership Network" },
    { id: "ext-casey", name: "Casey Chen", title: "VP People Ops", company: "ScaleUp", reason: "Conference speaker connection" },
    { id: "ext-sam", name: "Sam Williams", title: "Chief People Officer", company: "FinServe", reason: "Executive coaching group" },
  ],
  "demo-elena": [
    { id: "ext-morgan", name: "Morgan Davis", title: "Founder", company: "HealthAI", reason: "Y Combinator batchmate" },
    { id: "ext-jamie", name: "Jamie Patel", title: "CEO", company: "MedTech Pro", reason: "Healthcare founders circle" },
    { id: "ext-drew", name: "Drew Santos", title: "Partner", company: "Health Ventures", reason: "Investor relationship" },
  ],
  "demo-david": [
    { id: "ext-riley", name: "Riley Thompson", title: "Strategy Director", company: "BCG", reason: "Former BCG colleague" },
    { id: "ext-avery", name: "Avery Johnson", title: "VP Strategy", company: "Fortune 100", reason: "Client relationship" },
    { id: "ext-quinn", name: "Quinn Martinez", title: "Chief Strategy Officer", company: "GrowthCo", reason: "McKinsey alumni network" },
  ],
  "demo-aisha": [
    { id: "ext-blake", name: "Blake Anderson", title: "CTO", company: "FinTech Hub", reason: "Fintech founders group" },
    { id: "ext-skyler", name: "Skyler Nguyen", title: "VP Engineering", company: "PayScale", reason: "Tech leadership community" },
    { id: "ext-charlie", name: "Charlie Brown", title: "Chief Architect", company: "BankTech", reason: "Industry conference speaker" },
  ],
  "demo-james": [
    { id: "ext-parker", name: "Parker White", title: "COO", company: "ManufactureCo", reason: "Operations leadership forum" },
    { id: "ext-reese", name: "Reese Taylor", title: "VP Operations", company: "LogiPro", reason: "Supply chain network" },
    { id: "ext-dakota", name: "Dakota Chen", title: "Director of Ops", company: "TechManufacture", reason: "Industry peer group" },
  ],
  "demo-lisa": [
    { id: "ext-peyton", name: "Peyton Garcia", title: "VP Marketing", company: "MediaNow", reason: "Marketing leadership circle" },
    { id: "ext-rowan", name: "Rowan Kim", title: "CMO", company: "BrandPro", reason: "Industry conference connection" },
    { id: "ext-sage", name: "Sage Miller", title: "Creative Director", company: "AdCraft", reason: "Creative leaders network" },
  ],
  "demo-michael": [
    { id: "ext-hayden", name: "Hayden Scott", title: "Managing Partner", company: "Consulting Group", reason: "Professional services network" },
    { id: "ext-emery", name: "Emery Davis", title: "VP Sales", company: "EnterprisePro", reason: "Sales leadership forum" },
    { id: "ext-finley", name: "Finley Ross", title: "Chief Revenue Officer", company: "SaaSCo", reason: "Revenue leaders community" },
  ],
};

// Fallback discoverable users when Supabase doesn't have enough
const FALLBACK_DISCOVERABLE_USERS = [
  { id: "disc-001", name: "Sophia Martinez", position: "VP of Operations", company: "TechFlow Inc" },
  { id: "disc-002", name: "Benjamin Lee", position: "Chief Strategy Officer", company: "InnovateLabs" },
  { id: "disc-003", name: "Olivia Chen", position: "Director of Engineering", company: "CloudScale" },
  { id: "disc-004", name: "Ethan Williams", position: "Head of Product", company: "DataDriven Co" },
  { id: "disc-005", name: "Ava Johnson", position: "VP of Marketing", company: "GrowthPro" },
  { id: "disc-006", name: "Noah Brown", position: "CTO", company: "StartupXYZ" },
  { id: "disc-007", name: "Isabella Davis", position: "Director of Sales", company: "EnterprisePlus" },
  { id: "disc-008", name: "Liam Wilson", position: "Chief People Officer", company: "TalentFirst" },
  { id: "disc-009", name: "Mia Garcia", position: "VP of Finance", company: "CapitalWorks" },
  { id: "disc-010", name: "Lucas Anderson", position: "Head of Partnerships", company: "ConnectHub" },
  { id: "disc-011", name: "Emma Thomas", position: "Director of Innovation", company: "FutureTech" },
  { id: "disc-012", name: "Mason Taylor", position: "VP of Customer Success", company: "ClientFirst" },
  { id: "disc-013", name: "Charlotte Moore", position: "Chief Revenue Officer", company: "SalesForce Pro" },
  { id: "disc-014", name: "James Jackson", position: "Director of Data Science", company: "AnalyticsCo" },
  { id: "disc-015", name: "Amelia White", position: "VP of Design", company: "CreativeStudio" },
  { id: "disc-016", name: "Alexander Harris", position: "Head of Growth", company: "ScaleUp Inc" },
  { id: "disc-017", name: "Harper Martin", position: "Director of BD", company: "PartnerPro" },
  { id: "disc-018", name: "Daniel Thompson", position: "CIO", company: "InfoTech Systems" },
  { id: "disc-019", name: "Evelyn Robinson", position: "VP of Talent", company: "PeopleFirst" },
  { id: "disc-020", name: "Henry Clark", position: "Chief Product Officer", company: "ProductLab" },
];

// Register extended network demo users in the users store so their profiles can be viewed
function ensureExtendedNetworkUsersExist() {
  // Register demo extended network users
  for (const contacts of Object.values(DEMO_EXTENDED_NETWORK)) {
    for (const contact of contacts) {
      if (!users.has(contact.id)) {
        users.set(contact.id, {
          id: contact.id,
          email: `${contact.id}@demo.networknav.com`,
          name: contact.name,
          position: contact.title,
          company: contact.company,
          industry: "Technology",
          level: "director",
          goals: ["networking", "learning"],
          bio: `${contact.name} is a ${contact.title} at ${contact.company}. Discoverable through the network.`,
          profilePicture: null,
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }
  
  // Register fallback discoverable users
  for (const user of FALLBACK_DISCOVERABLE_USERS) {
    if (!users.has(user.id)) {
      users.set(user.id, {
        id: user.id,
        email: `${user.id}@demo.networknav.com`,
        name: user.name,
        position: user.position,
        company: user.company,
        industry: "Technology",
        level: "director",
        goals: ["networking", "learning"],
        bio: `${user.name} is a ${user.position} at ${user.company}. Discoverable through the network.`,
        profilePicture: null,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

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

  // Get top 80 matches by score — keeps graph performant and legible at 300+ attendees
  const matches = (userMatches.get(userId) || [])
    .filter(m => !m.passed)
    .sort((a, b) => b.score - a.score)
    .slice(0, 80);

  // Add nodes from matches
  for (const match of matches) {
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

    // Return cached response if available (10-min TTL per CACHE_TTLS.NETWORK_DATA)
    const cacheKey = CACHE_KEYS.NETWORK_DATA(currentUserId);
    const cached = cache.get<{ network: NetworkGraphData; insights: object; extendedNetwork: object }>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // Ensure extended network demo users exist in the users store
    ensureExtendedNetworkUsersExist();

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

    // Build extended network map (people you could meet through each connection)
    // Show users that are NOT already in the current user's network
    const extendedNetwork: Record<string, Array<{ id: string; name: string; title: string; company: string; reason: string }>> = {};
    
    // Get IDs of people already in the network (including current user)
    const networkUserIds = new Set(networkData.nodes.map(n => n.id));
    
    // Get all non-user nodes
    const otherNodes = networkData.nodes.filter(n => n.id !== currentUserId && n.matchType !== "neutral");
    
    // Try to fetch users from Supabase that are NOT in the network
    let outsideNetworkUsers: Array<{ id: string; name: string; position: string; company: string }> = [];
    
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: allUsers } = await supabaseAdmin
          .from("user_profiles")
          .select("id, name, position, company")
          .eq("is_active", true)
          .limit(50);
        
        if (allUsers) {
          // Filter to users NOT in the current network
          outsideNetworkUsers = (allUsers as Array<{ id: string; name: string; position?: string; company?: string }>)
            .filter(u => !networkUserIds.has(u.id) && u.name && u.name.trim() !== "")
            .map(u => ({
              id: u.id,
              name: u.name,
              position: u.position || "Professional",
              company: u.company || "",
            }));
        }
      } catch (error) {
        console.error("Failed to fetch outside network users:", error);
      }
    }
    
    // Track which fallback users have been assigned to avoid duplicates across connections
    const usedFallbackIds = new Set<string>();
    
    for (const node of otherNodes) {
      // First check if we have predefined demo data
      if (DEMO_EXTENDED_NETWORK[node.id]) {
        extendedNetwork[node.id] = DEMO_EXTENDED_NETWORK[node.id];
      } else {
        // Combine Supabase users with fallback users to ensure we have enough
        const availableUsers = [...outsideNetworkUsers];
        
        // Add fallback users that haven't been used yet
        for (const fallbackUser of FALLBACK_DISCOVERABLE_USERS) {
          if (!networkUserIds.has(fallbackUser.id) && !usedFallbackIds.has(fallbackUser.id)) {
            availableUsers.push(fallbackUser);
          }
        }
        
        // Shuffle and pick 3 different ones for each connection
        const shuffled = availableUsers.sort(() => Math.random() - 0.5);
        const selectedUsers = shuffled.slice(0, 3);
        
        const discoverable = selectedUsers.map(user => {
          // Track used fallback IDs
          if (user.id.startsWith("disc-")) {
            usedFallbackIds.add(user.id);
          }
          
          // Register this user in memory so their profile can be viewed
          if (!users.has(user.id)) {
            users.set(user.id, {
              id: user.id,
              email: `${user.id}@networknav.com`,
              name: user.name,
              position: user.position,
              company: user.company,
              industry: "Technology",
              level: "professional",
              goals: ["networking"],
              bio: `${user.name} is a ${user.position}${user.company ? ` at ${user.company}` : ""}. Connect through your network to learn more.`,
              profilePicture: null,
              isAdmin: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          
          return {
            id: user.id,
            name: user.name,
            title: user.position,
            company: user.company,
            reason: `${node.name.split(" ")[0]} can introduce you`,
          };
        });
        
        if (discoverable.length > 0) {
          extendedNetwork[node.id] = discoverable;
        }
      }
    }

    const responseData = { network: networkData, insights, extendedNetwork };
    cache.set(cacheKey, responseData, CACHE_TTLS.NETWORK_DATA);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Network data error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}



