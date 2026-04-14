import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { users, userMatches } from "@/lib/stores";
import { cookies } from "next/headers";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { isLiveDatabaseMode } from "@/lib/supabase/data-mode";
import { cache, CACHE_KEYS, CACHE_TTLS } from "@/lib/cache";
import { fetchProfileBasics } from "@/lib/network/fetch-profile-basics";
import { ensureMatchesLoaded } from "@/lib/network/ensure-matches-loaded";
import type { NetworkGraphData, NetworkNode, NetworkEdge, NetworkCluster, MatchType, Match } from "@/types";

async function fetchEmailsByIds(ids: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (!ids.length || !isSupabaseConfigured || !supabaseAdmin) return map;
  try {
    const { data } = await supabaseAdmin.from("user_profiles").select("id, email").in("id", ids);
    for (const row of data || []) {
      const r = row as { id: string; email: string | null };
      map.set(r.id, r.email ?? null);
    }
  } catch (e) {
    console.error("network route: fetchEmailsByIds", e);
  }
  return map;
}

function buildNetworkFromMatches(userId: string): NetworkGraphData {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const clusterMap = new Map<string, string[]>();

  const currentUser = Array.from(users.values()).find((u) => u.id === userId);
  if (currentUser) {
    nodes.push({
      id: userId,
      name: currentUser.name,
      title: currentUser.title,
      company: currentUser.company,
      matchType: "neutral",
      commonalityCount: 0,
      commonalities: [],
    });
  } else {
    nodes.push({
      id: userId,
      name: "You",
      title: "Member",
      company: undefined,
      matchType: "neutral",
      commonalityCount: 0,
      commonalities: [],
    });
  }

  // Top matches by score, cap 80 — performant with large attendee lists (friend’s optimization)
  const matches = (userMatches.get(userId) || [])
    .filter((m) => !m.passed)
    .sort((a, b) => b.score - a.score)
    .slice(0, 80);

  for (const match of matches) {
    const matchType: MatchType = match.type;
    const commonalityDescriptions = match.commonalities.map((c) => c.description);

    nodes.push({
      id: match.matchedUserId,
      name: match.matchedUser.profile.name,
      title: match.matchedUser.profile.title || "Member",
      company: match.matchedUser.profile.company,
      photoUrl: match.matchedUser.profile.photoUrl,
      matchType,
      commonalityCount: match.commonalities.length,
      commonalities: commonalityDescriptions,
      email: match.matchedUser.email ?? undefined,
    });

    edges.push({
      source: userId,
      target: match.matchedUserId,
      strength: match.score,
      commonalities: commonalityDescriptions,
    });

    const clusterKey = matchType === "high-affinity" ? "high-affinity" : "strategic";
    if (!clusterMap.has(clusterKey)) clusterMap.set(clusterKey, []);
    clusterMap.get(clusterKey)!.push(match.matchedUserId);
  }

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

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();
    const cookieStore = cookies();
    const deviceId = cookieStore.get("device_id")?.value;
    const currentUserId = session?.userId || deviceId || "";

    if (!currentUserId) {
      return NextResponse.json({
        success: true,
        data: {
          network: {
            userId: "",
            nodes: [],
            edges: [],
            clusters: [],
            generatedAt: new Date(),
          },
          insights: {
            totalConnections: 0,
            highAffinityCount: 0,
            strategicCount: 0,
            averageStrength: 0,
            strongestCluster: "None",
            topCommonality: "No commonalities yet",
            recommendation: "Sign in and complete matching to see your network.",
          },
          extendedNetwork: {} as Record<string, Array<{ id: string; name: string; title: string; company: string; reason: string }>>,
        },
      });
    }

    const cacheKey = CACHE_KEYS.NETWORK_DATA(currentUserId);
    const cached = cache.get<{
      network: NetworkGraphData;
      insights: object;
      extendedNetwork: object;
    }>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // Ensure matches are populated — they may be empty if user navigated directly to /network
    if (!userMatches.get(currentUserId)?.length && isLiveDatabaseMode() && supabaseAdmin) {
      try {
        const matches = await ensureMatchesLoaded(currentUserId, session?.email);
        if (matches.length > 0) {
          userMatches.set(currentUserId, matches);
        }
      } catch (e) {
        console.error("network route: ensureMatchesLoaded", e);
      }
    }

    let networkData = buildNetworkFromMatches(currentUserId);

    const profile = await fetchProfileBasics(currentUserId);
    if (profile) {
      const center = networkData.nodes.find((n) => n.id === currentUserId && n.matchType === "neutral");
      if (center) {
        center.name = profile.name;
        center.title = profile.title;
        center.company = profile.company;
        center.email = profile.email ?? undefined;
        center.photoUrl = profile.photoUrl;
      }
    }

    const idsNeedingEmail = networkData.nodes
      .filter((n) => n.matchType !== "neutral" && !n.email)
      .map((n) => n.id);
    const emailMap = await fetchEmailsByIds(idsNeedingEmail);
    networkData = {
      ...networkData,
      nodes: networkData.nodes.map((n) => {
        if (n.matchType === "neutral" || n.email) return n;
        const em = emailMap.get(n.id);
        return em ? { ...n, email: em } : n;
      }),
    };

    const highAffinityCount = networkData.nodes.filter((n) => n.matchType === "high-affinity").length;
    const strategicCount = networkData.nodes.filter((n) => n.matchType === "strategic").length;
    const totalConnections = networkData.edges.length;
    const avgStrength =
      totalConnections > 0
        ? networkData.edges.reduce((sum, e) => sum + e.strength, 0) / totalConnections
        : 0;

    const strongestCluster = networkData.clusters.reduce(
      (best, cluster) => (cluster.nodeIds.length > (best?.nodeIds.length || 0) ? cluster : best),
      networkData.clusters[0]
    );

    const commonalityCounts: Record<string, number> = {};
    networkData.edges.forEach((edge) => {
      edge.commonalities.forEach((c) => {
        commonalityCounts[c] = (commonalityCounts[c] || 0) + 1;
      });
    });
    const topCommonality = Object.entries(commonalityCounts).sort(([, a], [, b]) => b - a)[0];

    const insights = {
      totalConnections,
      highAffinityCount,
      strategicCount,
      averageStrength: Math.round(avgStrength * 100),
      strongestCluster: strongestCluster?.name || "None",
      topCommonality: topCommonality?.[0] || "No commonalities yet",
      recommendation:
        strategicCount < highAffinityCount
          ? "Consider exploring more strategic connections for diverse perspectives"
          : "Great balance! You have strong strategic connections",
    };

    const networkUserIds = new Set(networkData.nodes.map((n) => n.id));
    const otherNodes = networkData.nodes.filter((n) => n.id !== currentUserId && n.matchType !== "neutral");

    const extendedNetwork: Record<
      string,
      Array<{ id: string; name: string; title: string; company: string; reason: string }>
    > = {};

    let outsidePool: Array<{ id: string; name: string; title: string; company: string }> = [];
    if (isSupabaseConfigured && supabaseAdmin && otherNodes.length > 0) {
      try {
        const { data: allUsers } = await supabaseAdmin
          .from("user_profiles")
          .select("id, name, title, company")
          .eq("is_active", true)
          .limit(80);

        if (allUsers) {
          outsidePool = (allUsers as Array<{ id: string; name: string; title?: string; company?: string }>)
            .filter((u) => !networkUserIds.has(u.id) && u.name?.trim())
            .map((u) => ({
              id: u.id,
              name: u.name,
              title: u.title || "Professional",
              company: u.company || "",
            }));
        }
      } catch (e) {
        console.error("Extended network fetch:", e);
      }
    }

    if (outsidePool.length > 0) {
      const pool = outsidePool;
      otherNodes.forEach((node, i) => {
        const used = new Set<string>();
        const chunk: typeof pool = [];
        for (let j = 0; j < 3; j++) {
          const idx = (i * 3 + j) % pool.length;
          const u = pool[idx];
          if (!used.has(u.id)) {
            used.add(u.id);
            chunk.push(u);
          }
        }
        let k = 0;
        while (chunk.length < 3 && chunk.length < pool.length && k < pool.length) {
          const u = pool[k++];
          if (!used.has(u.id)) {
            used.add(u.id);
            chunk.push(u);
          }
        }
        if (chunk.length) {
          extendedNetwork[node.id] = chunk.map((u) => ({
            id: u.id,
            name: u.name,
            title: u.title,
            company: u.company,
            reason: `${node.name.split(" ")[0]} may know people in your org`,
          }));
        }
      });
    }

    const responseData = { network: networkData, insights, extendedNetwork };
    cache.set(cacheKey, responseData, CACHE_TTLS.NETWORK_DATA);

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Network data error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
