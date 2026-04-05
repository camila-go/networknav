"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, TypingIndicator } from "@/components/questionnaire/chat-message";
import { cn } from "@/lib/utils";

type Turn = { role: "host" | "user"; content: string };

const WELCOME: Turn = {
  role: "host",
  content:
    "Hi — I'm Jynx. Ask me about your matches, who to prioritize meeting, or how to follow up after intros. I only know what’s in your current match list, so for anyone else use Search.",
};

export function JynxNetworkFab({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([WELCOME]);
    }
  }, [open, messages.length]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const nextUser: Turn = { role: "user", content: text };
    const historyForApi: Turn[] = [...messages, nextUser];
    setInput("");
    setMessages(historyForApi);
    setLoading(true);

    const apiPayload = historyForApi.map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    try {
      const res = await fetch("/api/network-assistant", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiPayload }),
      });
      let json: {
        success?: boolean;
        error?: string;
        data?: { message?: string };
      };
      try {
        json = await res.json();
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "host",
            content:
              "The server returned an unexpected response. Try again, or refresh the page.",
          },
        ]);
        return;
      }

      const message =
        json?.success && typeof json?.data?.message === "string"
          ? json.data.message
          : typeof json?.error === "string"
            ? json.error
            : res.ok
              ? "Something went wrong. Try again in a moment."
              : `Request failed (${res.status}). Try again in a moment.`;

      setMessages((prev) => [...prev, { role: "host", content: message }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "host",
          content: "Couldn’t reach the server. Check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Ask Jynx about your network"
          title="Ask Jynx"
          className={cn(
            "fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-cyan-500/25",
            "bg-gradient-to-br from-cyan-500 to-teal-600 text-black",
            "hover:from-cyan-400 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-black",
            "right-4 bottom-24 md:bottom-8",
            "transition-transform hover:scale-[1.03] active:scale-[0.98]",
            className
          )}
        >
          <MessageCircle className="h-7 w-7" strokeWidth={2} />
          <span className="sr-only">Jynx</span>
        </button>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "flex h-[min(85dvh,640px)] max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
            "border-white/10 bg-[#0a1628] text-white"
          )}
        >
          <DialogHeader className="space-y-1 border-b border-white/10 px-4 py-3 pr-12 text-left">
            <DialogTitle className="text-base text-white">Jynx</DialogTitle>
            <DialogDescription className="text-xs text-cyan-200/70">
              Ask about your summit network, matches, and follow-ups
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 px-4 py-3">
            <div className="space-y-4 pr-2">
              {messages.map((m, i) => (
                <ChatMessage key={`${i}-${m.content.slice(0, 12)}`} role={m.role} content={m.content} />
              ))}
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="flex gap-2 border-t border-white/10 p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your network…"
              className="flex-1 border-zinc-600 bg-zinc-950/80 text-white placeholder:text-zinc-500"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              type="button"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="shrink-0 bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400"
            >
              Send
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
