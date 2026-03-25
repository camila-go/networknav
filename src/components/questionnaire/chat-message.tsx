"use client";

import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

export type ChatMessageRole = "host" | "user";

interface ChatMessageProps {
  role: ChatMessageRole;
  content: string;
  animate?: boolean;
}

export function ChatMessage({ role, content, animate = true }: ChatMessageProps) {
  const isHost = role === "host";

  return (
    <div
      className={cn(
        "flex gap-3",
        isHost ? "justify-start" : "justify-end",
        animate && "animate-slide-up"
      )}
    >
      {isHost && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-4 h-4 text-black" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isHost
            ? "bg-white/10 text-white rounded-tl-sm"
            : "bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-medium rounded-tr-sm"
        )}
      >
        {content}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 justify-start animate-slide-up">
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Bot className="w-4 h-4 text-black" />
        </div>
      </div>
      <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
