import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connections, messages } from "@/lib/stores";
import { messageSchema } from "@/lib/validations";
import type { Message } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");

    if (!connectionId) {
      // Return all conversations
      const conversations = await getConversations(session.userId);
      return NextResponse.json({
        success: true,
        data: { conversations },
      });
    }

    // Verify user is part of this connection
    const connection = connections.get(connectionId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Connection not found" },
        { status: 404 }
      );
    }

    if (
      connection.requesterId !== session.userId &&
      connection.recipientId !== session.userId
    ) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    if (connection.status !== "accepted") {
      return NextResponse.json(
        { success: false, error: "Connection not accepted" },
        { status: 403 }
      );
    }

    // Get messages for this connection
    const connectionMessages = messages.get(connectionId) || [];

    // Mark messages as read
    const updatedMessages = connectionMessages.map((msg) => {
      if (msg.senderId !== session.userId && !msg.read) {
        return { ...msg, read: true };
      }
      return msg;
    });
    messages.set(connectionId, updatedMessages);

    return NextResponse.json({
      success: true,
      data: { messages: updatedMessages },
    });
  } catch (error) {
    console.error("Get messages error:", error);
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
    const { connectionId, content } = body;

    // Validate content
    const result = messageSchema.safeParse({ content });
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid message",
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Verify connection exists and is accepted
    const connection = connections.get(connectionId);
    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Connection not found" },
        { status: 404 }
      );
    }

    if (
      connection.requesterId !== session.userId &&
      connection.recipientId !== session.userId
    ) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    if (connection.status !== "accepted") {
      return NextResponse.json(
        { success: false, error: "Cannot message - connection not accepted" },
        { status: 403 }
      );
    }

    // Create message
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connectionId,
      senderId: session.userId,
      content: result.data.content,
      read: false,
      createdAt: new Date(),
    };

    // Add to messages store
    const connectionMessages = messages.get(connectionId) || [];
    connectionMessages.push(message);
    messages.set(connectionId, connectionMessages);

    return NextResponse.json(
      {
        success: true,
        data: { message },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

async function getConversations(userId: string) {
  const conversations = [];

  for (const connection of connections.values()) {
    // Only include accepted connections for the current user
    if (connection.status !== "accepted") continue;
    if (
      connection.requesterId !== userId &&
      connection.recipientId !== userId
    )
      continue;

    const connectionMessages = messages.get(connection.id) || [];
    const lastMessage = connectionMessages[connectionMessages.length - 1];
    const unreadCount = connectionMessages.filter(
      (m) => m.senderId !== userId && !m.read
    ).length;

    conversations.push({
      connectionId: connection.id,
      connection,
      lastMessage,
      unreadCount,
      messageCount: connectionMessages.length,
    });
  }

  // Sort by last message date (most recent first)
  conversations.sort((a, b) => {
    const aDate = a.lastMessage?.createdAt || a.connection.createdAt;
    const bDate = b.lastMessage?.createdAt || b.connection.createdAt;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return conversations;
}


