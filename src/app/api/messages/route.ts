import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connections, messages, users } from "@/lib/stores";
import { messageSchema } from "@/lib/validations";
import type { Message, Connection } from "@/types";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

type SimpleUser = { id: string; name: string; position: string; company?: string };

// Helper to get user profile by ID from in-memory
function getUserById(userId: string): SimpleUser | null {
  for (const [, user] of users.entries()) {
    if (user.id === userId) {
      return {
        id: user.id,
        name: user.name,
        position: user.position,
        company: user.company,
      };
    }
  }
  // Check for demo users
  const demoUsers: Record<string, SimpleUser> = {
    "demo-sarah": { id: "demo-sarah", name: "Sarah Chen", position: "VP of Engineering", company: "TechCorp" },
    "demo-marcus": { id: "demo-marcus", name: "Marcus Johnson", position: "Chief People Officer", company: "GrowthStartup" },
    "demo-elena": { id: "demo-elena", name: "Elena Rodriguez", position: "CEO", company: "InnovateCo" },
    "demo-david": { id: "demo-david", name: "David Park", position: "VP of Product", company: "ScaleUp Inc" },
    "demo-aisha": { id: "demo-aisha", name: "Aisha Patel", position: "CTO", company: "FinanceFlow" },
  };
  return demoUsers[userId] || null;
}

// Get user from Supabase
async function getUserFromSupabase(userId: string): Promise<SimpleUser | null> {
  if (!isSupabaseConfigured || !supabaseAdmin) return null;
  
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, name, position, company')
    .eq('id', userId)
    .single();
  
  if (error || !data) return null;
  
  // Type assertion for Supabase response
  const row = data as { id: string; name: string; position?: string; company?: string };
  
  return {
    id: row.id,
    name: row.name,
    position: row.position || '',
    company: row.company || undefined,
  };
}

// Type for Supabase connection row
interface ConnectionRow {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
}

// Type for Supabase message row
interface MessageRow {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

// Load connections from Supabase
async function loadConnectionsFromSupabase(userId: string): Promise<Connection[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];
  
  const { data, error } = await supabaseAdmin
    .from('connections')
    .select('*')
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('[Messages API] Supabase connections load error:', error);
    return [];
  }
  
  return ((data || []) as ConnectionRow[]).map(row => ({
    id: row.id,
    requesterId: row.requester_id,
    recipientId: row.recipient_id,
    status: row.status as Connection['status'],
    message: row.message,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));
}

// Save connection to Supabase
async function saveConnectionToSupabase(connection: Connection): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseAdmin) return false;
  
  const { error } = await supabaseAdmin
    .from('connections')
    .upsert({
      id: connection.id,
      requester_id: connection.requesterId,
      recipient_id: connection.recipientId,
      status: connection.status,
      message: connection.message || null,
      created_at: connection.createdAt.toISOString(),
      updated_at: connection.updatedAt.toISOString(),
    } as never, { onConflict: 'id' });
  
  if (error) {
    console.error('[Messages API] Supabase connection save error:', error);
    return false;
  }
  
  console.log('[Messages API] Connection saved to Supabase:', connection.id);
  return true;
}

// Load messages from Supabase
async function loadMessagesFromSupabase(connectionId: string): Promise<Message[]> {
  if (!isSupabaseConfigured || !supabaseAdmin) return [];
  
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('[Messages API] Supabase messages load error:', error);
    return [];
  }
  
  return ((data || []) as MessageRow[]).map(row => ({
    id: row.id,
    connectionId: row.connection_id,
    senderId: row.sender_id,
    content: row.content,
    read: row.read,
    createdAt: new Date(row.created_at),
  }));
}

// Save message to Supabase
async function saveMessageToSupabase(message: Message): Promise<boolean> {
  if (!isSupabaseConfigured || !supabaseAdmin) return false;
  
  const { error } = await supabaseAdmin
    .from('messages')
    .insert({
      id: message.id,
      connection_id: message.connectionId,
      sender_id: message.senderId,
      content: message.content,
      read: message.read,
      created_at: message.createdAt.toISOString(),
    } as never);
  
  if (error) {
    console.error('[Messages API] Supabase message save error:', error);
    return false;
  }
  
  console.log('[Messages API] Message saved to Supabase:', message.id);
  return true;
}

// Mark messages as read in Supabase
async function markMessagesReadInSupabase(connectionId: string, userId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabaseAdmin) return;
  
  await supabaseAdmin
    .from('messages')
    .update({ read: true } as never)
    .eq('connection_id', connectionId)
    .neq('sender_id', userId)
    .eq('read', false);
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    const deviceId = request.cookies.get("device_id")?.value;
    const userId = session?.userId || deviceId;

    if (!userId) {
      return NextResponse.json({
        success: true,
        data: { conversations: [] },
      });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");

    if (!connectionId) {
      // Return all conversations
      const conversations = await getConversations(userId);
      return NextResponse.json({
        success: true,
        data: { conversations },
      });
    }

    // Try to get connection from Supabase first, then in-memory
    let connection = connections.get(connectionId);
    if (!connection && isSupabaseConfigured) {
      const supabaseConnections = await loadConnectionsFromSupabase(userId);
      connection = supabaseConnections.find(c => c.id === connectionId);
    }

    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Connection not found" },
        { status: 404 }
      );
    }

    if (
      connection.requesterId !== userId &&
      connection.recipientId !== userId
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

    // Get messages - try Supabase first, then in-memory
    let connectionMessages = await loadMessagesFromSupabase(connectionId);
    if (connectionMessages.length === 0) {
      connectionMessages = messages.get(connectionId) || [];
    }

    // Mark messages as read
    await markMessagesReadInSupabase(connectionId, userId);
    
    // Also update in-memory
    const updatedMessages = connectionMessages.map((msg) => {
      if (msg.senderId !== userId && !msg.read) {
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
    
    const deviceId = request.cookies.get("device_id")?.value;
    const userId = session?.userId || deviceId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { connectionId, targetUserId, content } = body;

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

    let actualConnectionId = connectionId;

    // For new conversations with targetUserId, create or find a connection
    if (!connectionId && targetUserId) {
      // Check Supabase first for existing connection
      let existingConnection: Connection | null = null;
      
      if (isSupabaseConfigured) {
        const supabaseConnections = await loadConnectionsFromSupabase(userId);
        existingConnection = supabaseConnections.find(c =>
          (c.requesterId === userId && c.recipientId === targetUserId) ||
          (c.requesterId === targetUserId && c.recipientId === userId)
        ) || null;
      }
      
      // Then check in-memory
      if (!existingConnection) {
        for (const conn of connections.values()) {
          if (
            (conn.requesterId === userId && conn.recipientId === targetUserId) ||
            (conn.requesterId === targetUserId && conn.recipientId === userId)
          ) {
            existingConnection = conn;
            break;
          }
        }
      }

      if (existingConnection) {
        actualConnectionId = existingConnection.id;
        // Auto-accept if pending
        if (existingConnection.status === "pending") {
          existingConnection.status = "accepted";
          existingConnection.updatedAt = new Date();
          connections.set(existingConnection.id, existingConnection);
          await saveConnectionToSupabase(existingConnection);
        }
      } else {
        // Create new connection (auto-accepted)
        const newConnectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newConnection: Connection = {
          id: newConnectionId,
          requesterId: userId,
          recipientId: targetUserId,
          status: "accepted",
          message: "Connected via Jynx",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Save to both stores
        connections.set(newConnectionId, newConnection);
        await saveConnectionToSupabase(newConnection);
        
        actualConnectionId = newConnectionId;
        console.log('[Messages API] New connection created:', newConnectionId);
      }
    }

    // Verify connection exists
    let connection = connections.get(actualConnectionId);
    if (!connection && isSupabaseConfigured) {
      const supabaseConnections = await loadConnectionsFromSupabase(userId);
      connection = supabaseConnections.find(c => c.id === actualConnectionId);
    }

    if (!connection) {
      return NextResponse.json(
        { success: false, error: "Connection not found" },
        { status: 404 }
      );
    }

    if (
      connection.requesterId !== userId &&
      connection.recipientId !== userId
    ) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    // Create message
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connectionId: actualConnectionId,
      senderId: userId,
      content: result.data.content,
      read: false,
      createdAt: new Date(),
    };

    // Save to in-memory
    const connectionMessages = messages.get(actualConnectionId) || [];
    connectionMessages.push(message);
    messages.set(actualConnectionId, connectionMessages);

    // Save to Supabase
    const savedToSupabase = await saveMessageToSupabase(message);
    console.log('[Messages API] Message created:', { id: message.id, savedToSupabase });

    return NextResponse.json(
      {
        success: true,
        data: { message, connectionId: actualConnectionId },
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

  // Load connections from Supabase and merge with in-memory
  const supabaseConnections = await loadConnectionsFromSupabase(userId);
  const allConnections = new Map<string, Connection>();
  
  // Add Supabase connections
  for (const conn of supabaseConnections) {
    allConnections.set(conn.id, conn);
  }
  
  // Add in-memory connections (won't overwrite Supabase ones if same ID)
  for (const conn of connections.values()) {
    if (!allConnections.has(conn.id)) {
      if (conn.requesterId === userId || conn.recipientId === userId) {
        allConnections.set(conn.id, conn);
      }
    }
  }

  for (const connection of allConnections.values()) {
    // Only include accepted connections
    if (connection.status !== "accepted") continue;

    // Get messages from Supabase first, then in-memory
    let connectionMessages = await loadMessagesFromSupabase(connection.id);
    if (connectionMessages.length === 0) {
      connectionMessages = messages.get(connection.id) || [];
    }

    const lastMessage = connectionMessages[connectionMessages.length - 1];
    const unreadCount = connectionMessages.filter(
      (m) => m.senderId !== userId && !m.read
    ).length;

    // Get the other user's data
    const otherUserId = connection.requesterId === userId 
      ? connection.recipientId 
      : connection.requesterId;
    
    // Try in-memory first, then Supabase
    let otherUser = getUserById(otherUserId);
    if (!otherUser) {
      otherUser = await getUserFromSupabase(otherUserId);
    }

    conversations.push({
      connectionId: connection.id,
      connection,
      lastMessage,
      unreadCount,
      messageCount: connectionMessages.length,
      otherUser: otherUser || { 
        id: otherUserId, 
        name: "Unknown User", 
        position: "Member" 
      },
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
