"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
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

interface ChatWindowProps {
  conversation?: Conversation;
  newConversation?: {
    userId: string;
    userName: string;
  };
  onBack?: () => void;
  onMessageSent?: () => void;
  isMobile?: boolean;
}

export function ChatWindow({
  conversation,
  newConversation,
  onBack,
  onMessageSent,
  isMobile,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle both existing conversation and new conversation
  const isNewConversation = !conversation && newConversation;
  const otherUser = conversation?.otherUser || (newConversation ? {
    id: newConversation.userId,
    name: newConversation.userName,
    position: "",
    company: undefined,
  } : undefined);
  const connectionId = conversation?.connectionId;
  
  const initials =
    otherUser?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  useEffect(() => {
    if (connectionId) {
      fetchMessages();
    } else {
      setIsLoading(false);
      setMessages([]);
    }
  }, [connectionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/messages?connectionId=${connectionId}`);
      const result = await response.json();

      if (result.success) {
        setMessages(result.data.messages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const body: Record<string, string> = {
        content: newMessage.trim(),
      };

      // For new conversations, send targetUserId instead of connectionId
      if (isNewConversation && newConversation) {
        body.targetUserId = newConversation.userId;
      } else if (connectionId) {
        body.connectionId = connectionId;
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        setMessages((prev) => [...prev, result.data.message]);
        setNewMessage("");
        onMessageSent?.();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Avatar className="h-10 w-10">
          <AvatarImage src={undefined} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-navy-900 truncate">
            {otherUser?.name || "Unknown"}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {otherUser?.position}
            {otherUser?.company && ` at ${otherUser.company}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <h4 className="font-medium text-navy-900">
              Start a conversation with {otherUser?.name}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Say hello and share what you'd like to discuss at the conference!
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isSender = message.senderId !== otherUser?.id;
              const showTimestamp =
                index === 0 ||
                new Date(message.createdAt).getTime() -
                  new Date(messages[index - 1].createdAt).getTime() >
                  300000; // 5 minutes

              return (
                <div key={message.id}>
                  {showTimestamp && (
                    <div className="text-center text-xs text-muted-foreground mb-2">
                      {formatRelativeTime(message.createdAt)}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex",
                      isSender ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2",
                        isSender
                          ? "bg-primary text-white rounded-br-sm"
                          : "bg-navy-100 text-navy-900 rounded-bl-sm"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <form onSubmit={handleSend} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

