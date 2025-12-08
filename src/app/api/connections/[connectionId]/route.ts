import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connections } from "@/lib/stores";
import type { ConnectionStatus } from "@/types";

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

    const connection = connections.get(params.connectionId);
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
        // Delete the connection
        connections.delete(params.connectionId);
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

    const connection = connections.get(params.connectionId);
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

