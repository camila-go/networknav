import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connections } from "@/lib/stores";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Connection, ConnectionStatus } from "@/types";

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

// Log connection activity for gamification (fire and forget)
async function logConnectionActivity(userId: string, connectionId: string, otherUserId: string): Promise<void> {
  try {
    if (!isSupabaseConfigured || !supabaseAdmin) return;
    
    // Insert activity for the user accepting the connection
    await supabaseAdmin
      .from('user_activity')
      .insert({
        user_id: userId,
        activity_type: 'connection_made',
        points_earned: 15,
        metadata: { connection_id: connectionId, other_user_id: otherUserId },
      });
    
    // Update stats for the accepting user
    const { data: existingStats } = await supabaseAdmin
      .from('user_gamification_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existingStats) {
      await supabaseAdmin
        .from('user_gamification_stats')
        .update({
          total_points: (existingStats.total_points || 0) + 15,
          points_this_week: (existingStats.points_this_week || 0) + 15,
          points_this_month: (existingStats.points_this_month || 0) + 15,
          connections_made: (existingStats.connections_made || 0) + 1,
          last_active_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      await supabaseAdmin
        .from('user_gamification_stats')
        .insert({
          user_id: userId,
          total_points: 15,
          points_this_week: 15,
          points_this_month: 15,
          connections_made: 1,
          last_active_at: new Date().toISOString(),
        });
    }
    
    console.log('[Connections API] Activity logged for user:', userId);
  } catch (error) {
    console.error('[Connections API] Failed to log activity:', error);
  }
}

// ============================================
// Route Handlers
// ============================================

// Update connection (accept/decline/withdraw)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    let connection = connections.get(params.connectionId);

    // Supabase fallback: connection may exist in DB but not in memory
    if (!connection && isSupabaseConfigured) {
      const loaded = await loadConnectionsFromSupabase(session.userId);
      const found = loaded.find((c) => c.id === params.connectionId);
      if (found) {
        connections.set(found.id, found);
        connection = found;
      }
    }

    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Connection not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action } = body as { action: "accept" | "decline" | "withdraw" };

    // Validate the user can perform this action
    if (action === "accept" || action === "decline") {
      // Only recipient can accept or decline
      if (connection.recipientId !== session.userId) {
        return NextResponse.json(
          { success: false, error: "Only the recipient can accept or decline" },
          { status: 403 }
        );
      }

      if (connection.status !== "pending") {
        return NextResponse.json(
          { success: false, error: "Connection is not pending" },
          { status: 400 }
        );
      }
    }

    if (action === "withdraw") {
      // Only requester can withdraw
      if (connection.requesterId !== session.userId) {
        return NextResponse.json(
          { success: false, error: "Only the requester can withdraw" },
          { status: 403 }
        );
      }

      if (connection.status !== "pending") {
        return NextResponse.json(
          { success: false, error: "Can only withdraw pending requests" },
          { status: 400 }
        );
      }
    }

    // Perform the action
    const now = new Date();
    let newStatus: ConnectionStatus;
    let message: string;

    switch (action) {
      case "accept":
        newStatus = "accepted";
        message = "Connection accepted! You can now message each other.";
        break;
      case "decline":
        newStatus = "declined";
        message = "Connection request declined.";
        break;
      case "withdraw":
        connections.delete(params.connectionId);
        deleteConnectionFromSupabase(params.connectionId).catch(() => {});
        return NextResponse.json({
          success: true,
          message: "Connection request withdrawn.",
        });
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }

    connection.status = newStatus;
    connection.updatedAt = now;
    connections.set(params.connectionId, connection);

    // Non-blocking Supabase write
    saveConnectionToSupabase(connection).catch(() => {});

    // Log activity for gamification when connection is accepted
    if (action === "accept") {
      // Both users get credit for the connection
      logConnectionActivity(session.userId, params.connectionId, connection.requesterId);
      logConnectionActivity(connection.requesterId, params.connectionId, session.userId);
    }

    return NextResponse.json({
      success: true,
      data: { connection },
      message,
    });
  } catch (error) {
    console.error("Update connection error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Delete connection (unfriend)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    let connection = connections.get(params.connectionId);

    // Supabase fallback: connection may exist in DB but not in memory
    if (!connection && isSupabaseConfigured) {
      const loaded = await loadConnectionsFromSupabase(session.userId);
      const found = loaded.find((c) => c.id === params.connectionId);
      if (found) {
        connections.set(found.id, found);
        connection = found;
      }
    }

    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Connection not found" },
        { status: 404 }
      );
    }

    // Only participants can delete the connection
    if (
      connection.requesterId !== session.userId &&
      connection.recipientId !== session.userId
    ) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    connections.delete(params.connectionId);
    deleteConnectionFromSupabase(params.connectionId).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Connection removed.",
    });
  } catch (error) {
    console.error("Delete connection error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
