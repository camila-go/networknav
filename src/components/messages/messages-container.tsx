"use client";

import { useState, useEffect } from "react";
import { ConversationList } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import { EmptyState } from "./empty-state";
import type { Connection, Message } from "@/types";

interface Conversation {
  connectionId: string;
  connection: Connection;
  lastMessage?: Message;
  unreadCount: number;
  messageCount: number;
  otherUser?: {
    id: string;
    name: string;
    position: string;
    company?: string;
  };
}

export function MessagesContainer() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    fetchConversations();
    // Check for mobile view
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  async function fetchConversations() {
    try {
      const response = await fetch("/api/messages");
      const result = await response.json();

      if (result.success) {
        // Add mock user data for demo (in production, this comes from the API)
        const conversationsWithUsers = result.data.conversations.map(
          (conv: Conversation, index: number) => ({
            ...conv,
            otherUser: getMockUser(index),
          })
        );
        setConversations(conversationsWithUsers);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectConversation(conversation: Conversation) {
    setSelectedConversation(conversation);
  }

  function handleBack() {
    setSelectedConversation(null);
  }

  function handleMessageSent() {
    // Refresh conversations to update last message
    fetchConversations();
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Mobile view: show either list or chat
  if (isMobileView) {
    if (selectedConversation) {
      return (
        <ChatWindow
          conversation={selectedConversation}
          onBack={handleBack}
          onMessageSent={handleMessageSent}
          isMobile
        />
      );
    }
    return (
      <div className="h-full">
        {conversations.length === 0 ? (
          <EmptyState />
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={null}
            onSelect={handleSelectConversation}
          />
        )}
      </div>
    );
  }

  // Desktop view: side-by-side
  return (
    <div className="h-full flex rounded-2xl overflow-hidden border bg-white">
      {/* Conversation list */}
      <div className="w-80 border-r flex-shrink-0">
        {conversations.length === 0 ? (
          <EmptyState compact />
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.connectionId || null}
            onSelect={handleSelectConversation}
          />
        )}
      </div>

      {/* Chat window */}
      <div className="flex-1">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock user data for demo
function getMockUser(index: number) {
  const users = [
    { id: "1", name: "Sarah Chen", position: "VP of Engineering", company: "TechCorp" },
    { id: "2", name: "Marcus Johnson", position: "Chief People Officer", company: "GrowthStartup" },
    { id: "3", name: "Elena Rodriguez", position: "CEO", company: "InnovateCo" },
  ];
  return users[index % users.length];
}

