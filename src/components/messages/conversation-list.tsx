"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
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

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  newConversationUser?: { id: string; name: string } | null;
  onSelectNewConversation?: () => void;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  newConversationUser,
  onSelectNewConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const name = conv.otherUser?.name.toLowerCase() || "";
    const company = conv.otherUser?.company?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || company.includes(query);
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg text-navy-900 mb-3">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {/* New conversation at top if present */}
        {newConversationUser && (
          <button
            onClick={onSelectNewConversation}
            className={cn(
              "w-full p-4 flex items-start gap-3 text-left transition-colors",
              "bg-teal-50 border-b border-teal-200 border-l-2 border-l-teal-500"
            )}
          >
            <Avatar className="h-12 w-12 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                {newConversationUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-navy-900 truncate">
                  {newConversationUser.name}
                </span>
                <Badge className="bg-teal-600 text-white text-xs">New</Badge>
              </div>
              <p className="text-sm text-teal-700">
                Start a conversation...
              </p>
            </div>
          </button>
        )}

        {filteredConversations.length === 0 && !newConversationUser ? (
          <div className="p-4 text-center text-navy-500 text-sm">
            No conversations found
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.connectionId}
              conversation={conversation}
              isSelected={selectedId === conversation.connectionId}
              onClick={() => onSelect(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { otherUser, lastMessage, unreadCount } = conversation;
  const initials =
    otherUser?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 flex items-start gap-3 text-left transition-colors",
        "hover:bg-navy-50 border-b border-navy-100",
        isSelected && "bg-primary/5 border-l-2 border-l-primary"
      )}
    >
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={undefined} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-navy-900 truncate">
            {otherUser?.name || "Unknown"}
          </span>
          {lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
              {formatRelativeTime(lastMessage.createdAt)}
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground truncate">
          {otherUser?.position}
          {otherUser?.company && ` at ${otherUser.company}`}
        </p>

        {lastMessage && (
          <p
            className={cn(
              "text-sm truncate mt-1",
              unreadCount > 0
                ? "text-navy-700 font-medium"
                : "text-muted-foreground"
            )}
          >
            {lastMessage.content}
          </p>
        )}
      </div>

      {unreadCount > 0 && (
        <Badge className="bg-primary text-white h-5 min-w-[20px] flex items-center justify-center">
          {unreadCount}
        </Badge>
      )}
    </button>
  );
}

