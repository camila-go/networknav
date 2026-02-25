import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connections } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Connection } from "@/types";

// ============================================
// Supabase Helpers
// ============================================

interface ConnectionRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

async function loadConnectionsFromSupabase(userId: string): Promise<Connection[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];

  const { data, error } = await supabaseAdmin
    .from("connections")
    .select("*")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Connections API] Supabase load error:", error);
    return [];
  }

  return ((data || []) as ConnectionRow[]).map((row) => ({
    id: row.id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    status: row.status as Connection["status"],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
  }));
}

async function saveConnectionToSupabase(connection: Connection): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from("connections")
    .upsert(
      {
        id: connection.id,
        requester_id: connection.requesterId,
        recipient_id: connection.recipientId,
        status: connection.status,
        created_at: connection.createdAt.toISOString(),
        updated_at: connection.updatedAt.toISOString(),
        expires_at: connection.expiresAt?.toISOString() ?? null,
      } as never,
      { onConflict: "id" }
    );

  if (error) {
    console.error("[Connections API] Supabase save error:", error);
  }
}

async function deleteConnectionFromSupabase(connectionId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from("connections")
    .delete()
    .eq("id", connectionId);

  if (error) {
    console.error("[Connections API] Supabase delete error:", error);
  }
}

// ============================================
// Route Handlers
// ============================================

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get all connections for the current user — memory first
    const userConnections: Connection[] = [];
    for (const connection of connections.values()) {
      if (
        connection.requesterId === session.userId ||
        connection.recipientId === session.userId
      ) {
        userConnections.push(connection);
      }
    }

    // Supabase fallback: populate when in-memory store is empty
    if (userConnections.length === 0 && isSupabaseConfigured) {
      const loaded = await loadConnectionsFromSupabase(session.userId);
      for (const conn of loaded) {
        if (!connections.has(conn.id)) {
          connections.set(conn.id, conn);
        }
        userConnections.push(conn);
      }
    }

    // Separate by status
    const pending = userConnections.filter((c) => c.status === "pending");
    const accepted = userConnections.filter((c) => c.status === "accepted");

    // Get pending requests sent TO this user
    const incomingRequests = pending.filter(
      (c) => c.recipientId === session.userId
    );
    // Get pending requests sent BY this user
    const outgoingRequests = pending.filter(
      (c) => c.requesterId === session.userId
    );

    return NextResponse.json({
      success: true,
      data: {
        connections: accepted,
        incomingRequests,
        outgoingRequests,
        counts: {
          connections: accepted.length,
          incoming: incomingRequests.length,
          outgoing: outgoingRequests.length,
        },
      },
    });
  } catch (error) {
    console.error("Get connections error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json(
        { success: false, error: "Recipient ID is required" },
        { status: 400 }
      );
    }

    // Check if trying to connect with self
    if (recipientId === session.userId) {
      return NextResponse.json(
        { success: false, error: "Cannot connect with yourself" },
        { status: 400 }
      );
    }

    // Check if connection already exists in memory
    for (const connection of connections.values()) {
      const isExisting =
        (connection.requesterId === session.userId &&
          connection.recipientId === recipientId) ||
        (connection.requesterId === recipientId &&
          connection.recipientId === session.userId);

      if (isExisting) {
        if (connection.status === "pending") {
          return NextResponse.json(
            { success: false, error: "Connection request already pending" },
            { status: 409 }
          );
        }
        if (connection.status === "accepted") {
          return NextResponse.json(
            { success: false, error: "Already connected" },
            { status: 409 }
          );
        }
      }
    }

    // Also check Supabase for a connection that might not be in memory
    if (isSupabaseConfigured) {
      const existing = await loadConnectionsFromSupabase(session.userId);
      for (const conn of existing) {
        const isExisting =
          (conn.requesterId === session.userId && conn.recipientId === recipientId) ||
          (conn.requesterId === recipientId && conn.recipientId === session.userId);
        if (isExisting) {
          if (!connections.has(conn.id)) connections.set(conn.id, conn);
          if (conn.status === "pending") {
            return NextResponse.json(
              { success: false, error: "Connection request already pending" },
              { status: 409 }
            );
          }
          if (conn.status === "accepted") {
            return NextResponse.json(
              { success: false, error: "Already connected" },
              { status: 409 }
            );
          }
        }
      }
    }

    // Create new connection request — UUID for DB FK compatibility
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 14); // Expires in 14 days

    const connection: Connection = {
      id: crypto.randomUUID(),
      requesterId: session.userId,
      recipientId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    connections.set(connection.id, connection);

    // Non-blocking Supabase write
    saveConnectionToSupabase(connection).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        data: { connection },
        message: "Connection request sent",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create connection error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
