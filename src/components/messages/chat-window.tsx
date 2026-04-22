"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { useSocket } from "@/lib/socket/client";
import type { MessageNewPayload, TypingPayload } from "@/lib/socket/types";
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
    title: string;
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
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { socket, isConnected } = useSocket();

  // Get current user ID from cookie
  useEffect(() => {
    const deviceId = document.cookie
      .split("; ")
      .find((row) => row.startsWith("device_id="))
      ?.split("=")[1];
    setCurrentUserId(deviceId || null);
  }, []);

  // Handle both existing conversation and new conversation
  const isNewConversation = !conversation && newConversation;
  const otherUser = conversation?.otherUser || (newConversation ? {
    id: newConversation.userId,
    name: newConversation.userName,
    title: "",
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

  const otherProfileHref = otherUser?.id ? `/user/${otherUser.id}` : null;

  // Join/leave conversation room via Socket.io
  useEffect(() => {
    if (!socket || !connectionId) return;
    socket.emit("conversation:join", connectionId);
    return () => {
      socket.emit("conversation:leave", connectionId);
    };
  }, [socket, connectionId]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket) return;

    function handleNewMessage(data: MessageNewPayload) {
      if (data.connectionId === connectionId) {
        setMessages((prev) => {
          // Avoid duplicates (in case HTTP response also added it)
          if (prev.some((m) => m.id === data.messageId)) return prev;
          return [
            ...prev,
            {
              id: data.messageId,
              connectionId: data.connectionId,
              senderId: data.senderId,
              content: data.content,
              read: false,
              createdAt: new Date(data.createdAt),
            },
          ];
        });
      }
    }

    socket.on("message:new", handleNewMessage);
    return () => {
      socket.off("message:new", handleNewMessage);
    };
  }, [socket, connectionId]);

  // Listen for typing indicators
  useEffect(() => {
    if (!socket) return;

    function handleTyping(data: TypingPayload) {
      if (data.connectionId === connectionId && data.userId !== otherUser?.id) return;
      if (data.connectionId !== connectionId) return;
      setIsOtherTyping(data.isTyping);

      if (data.isTyping) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
        }, 3000);
      }
    }

    socket.on("message:typing", handleTyping);
    return () => {
      socket.off("message:typing", handleTyping);
      clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, connectionId, otherUser?.id]);

  const fetchMessages = useCallback(async () => {
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
  }, [connectionId]);

  useEffect(() => {
    if (connectionId) {
      fetchMessages();
    } else {
      setIsLoading(false);
      setMessages([]);
    }
  }, [connectionId, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    
    console.log("[ChatWindow] handleSend called", {
      newMessage: newMessage,
      isSending: isSending,
      isNewConversation: isNewConversation,
      newConversation: newConversation,
      connectionId: connectionId,
    });
    
    if (!newMessage.trim() || isSending) {
      console.log("[ChatWindow] Early return - empty message or already sending");
      return;
    }

    // Check for self-messaging
    const targetId = newConversation?.userId || otherUser?.id;
    if (currentUserId && targetId && currentUserId === targetId) {
      alert("You cannot message yourself.");
      return;
    }

    const messageContent = newMessage.trim();
    setIsSending(true);

    // Helper function to send via HTTP
    const sendViaHttp = async (): Promise<boolean> => {
      try {
        const body: Record<string, string> = {
          content: messageContent,
        };

        if (isNewConversation && newConversation) {
          body.targetUserId = newConversation.userId;
          console.log("[ChatWindow] Sending to new user:", newConversation.userId);
        } else if (connectionId) {
          body.connectionId = connectionId;
          console.log("[ChatWindow] Sending to existing connection:", connectionId);
        } else {
          console.error("[ChatWindow] No targetUserId or connectionId available");
          return false;
        }

        console.log("[ChatWindow] HTTP request body:", JSON.stringify(body));

        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        });

        const result = await response.json();
        console.log("[ChatWindow] HTTP response:", result);

        if (result.success) {
          setMessages((prev) => [...prev, result.data.message]);
          setNewMessage("");
          onMessageSent?.();
          return true;
        } else {
          console.error("[ChatWindow] HTTP send failed:", result.error);
          alert(`Send failed: ${result.error || "Unknown error"}`);
          return false;
        }
      } catch (error) {
        console.error("[ChatWindow] HTTP error:", error);
        return false;
      }
    };

    // Helper function to send via Socket.io with timeout
    const sendViaSocket = (): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!socket || !isConnected) {
          resolve(false);
          return;
        }

        // Set timeout for socket response
        const timeout = setTimeout(() => {
          console.log("[ChatWindow] Socket timeout, falling back to HTTP");
          resolve(false);
        }, 5000);

        socket.emit(
          "message:send",
          {
            connectionId: connectionId || undefined,
            targetUserId: isNewConversation ? newConversation?.userId : undefined,
            content: messageContent,
          },
          (response) => {
            clearTimeout(timeout);
            
            if (response.success && response.data?.message) {
              setMessages((prev) => [...prev, response.data!.message as Message]);
              setNewMessage("");
              onMessageSent?.();
              
              // Emit stop typing
              if (connectionId) {
                socket.emit("message:typing", {
                  connectionId,
                  userId: "",
                  userName: "",
                  isTyping: false,
                });
              }
              resolve(true);
            } else {
              console.error("[ChatWindow] Socket send failed:", response.error);
              resolve(false);
            }
          }
        );
      });
    };

    try {
      console.log("[ChatWindow] Send attempt - Socket connected:", isConnected, "isNewConversation:", isNewConversation);
      
      // Try Socket.io first if connected, with HTTP fallback
      let success = false;
      
      if (socket && isConnected) {
        console.log("[ChatWindow] Trying Socket.io...");
        success = await sendViaSocket();
        console.log("[ChatWindow] Socket.io result:", success);
      } else {
        console.log("[ChatWindow] Socket not connected, skipping to HTTP");
      }
      
      // Fall back to HTTP if socket failed or not connected
      if (!success) {
        console.log("[ChatWindow] Trying HTTP fallback...");
        success = await sendViaHttp();
        console.log("[ChatWindow] HTTP result:", success);
      }
      
      if (!success) {
        alert("Failed to send message. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewMessage(e.target.value);

    // Emit typing indicator via Socket.io
    if (socket && connectionId) {
      socket.emit("message:typing", {
        connectionId,
        userId: "",
        userName: "",
        isTyping: e.target.value.length > 0,
      });
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {otherProfileHref ? (
          <Link href={otherProfileHref} className="flex-shrink-0">
            <Avatar className="h-10 w-10 border-2 border-white/20 hover:ring-2 hover:ring-cyan-500 hover:ring-offset-2 hover:ring-offset-black transition-all cursor-pointer">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <div className="flex-shrink-0">
            <Avatar className="h-10 w-10 border-2 border-white/20 transition-all">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {otherProfileHref ? (
            <Link href={otherProfileHref}>
              <h3 className="font-semibold text-white truncate hover:text-cyan-400 transition-colors cursor-pointer">
                {otherUser?.name || "Unknown"}
              </h3>
            </Link>
          ) : (
            <h3 className="font-semibold text-white truncate">{otherUser?.name || "Unknown"}</h3>
          )}
          <p className="text-sm text-white/60 truncate">
            {isOtherTyping ? (
              <span className="text-cyan-400">typing...</span>
            ) : (
              <>
                {otherUser?.title}
                {otherUser?.company && ` at ${otherUser.company}`}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <h4 className="font-medium text-white">
              Start a conversation with {otherUser?.name}
            </h4>
            <p className="text-sm text-white/60 mt-1 max-w-xs">
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
                    <div className="text-center text-xs text-white/40 mb-2">
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
                          ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-medium rounded-br-sm"
                          : "bg-white/10 text-white rounded-bl-sm"
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

      {/* Typing indicator */}
      {isOtherTyping && (
        <div className="px-4 py-1 text-xs text-white/50">
          {otherUser?.name} is typing...
        </div>
      )}

      {/* Message input */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-500 focus:ring-cyan-500/20"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newMessage.trim() || isSending}
            className="disabled:opacity-50"
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
