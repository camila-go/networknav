"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const newUserId = searchParams.get("userId");
  const newUserName = searchParams.get("name");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationUser, setNewConversationUser] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetchConversations();
    // Check for mobile view
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle incoming new conversation from URL params
  useEffect(() => {
    if (newUserId && newUserName) {
      setNewConversationUser({
        id: newUserId,
        name: decodeURIComponent(newUserName),
      });
      setShowNewConversation(true);
    }
  }, [newUserId, newUserName]);

  async function fetchConversations() {
    try {
      const response = await fetch("/api/messages", { credentials: "include" });
      const result = await response.json();

      if (result.success) {
        // User data now comes from the API
        setConversations(result.data.conversations);
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
      <div className="h-full flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
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
      <div className="h-full bg-black">
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
    <div className="h-full flex rounded-2xl overflow-hidden border border-white/10 bg-black">
      {/* Conversation list */}
      <div className="w-80 border-r border-white/10 flex-shrink-0 bg-black/50">
        {conversations.length === 0 && !showNewConversation ? (
          <EmptyState compact />
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.connectionId || null}
            onSelect={handleSelectConversation}
            newConversationUser={showNewConversation ? newConversationUser : null}
            onSelectNewConversation={() => {
              setSelectedConversation(null);
              setShowNewConversation(true);
            }}
          />
        )}
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-black">
        {showNewConversation && newConversationUser ? (
          <ChatWindow
            newConversation={{
              userId: newConversationUser.id,
              userName: newConversationUser.name,
            }}
            onMessageSent={() => {
              fetchConversations();
              setShowNewConversation(false);
            }}
          />
        ) : selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-white/50">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

