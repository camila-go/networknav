import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connections } from "@/lib/stores";
import type { Connection } from "@/types";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get all connections for the current user
    const userConnections: Connection[] = [];
    for (const connection of connections.values()) {
      if (
        connection.requesterId === session.userId ||
        connection.recipientId === session.userId
      ) {
        userConnections.push(connection);
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

    // Check if connection already exists
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

    // Create new connection request
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 14); // Expires in 14 days

    const connection: Connection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      requesterId: session.userId,
      recipientId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    connections.set(connection.id, connection);

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


