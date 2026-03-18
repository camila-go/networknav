"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
  Users,
  ImagePlus,
  X,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ExploreReply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName?: string;
}

interface ExplorePost {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName?: string;
  authorEmail?: string | null;
  imageUrls?: string[];
  replies?: ExploreReply[];
  reactionCounts?: Record<string, number>;
  myReaction?: string | null;
}

interface InterestStat {
  interest: string;
  count: number;
  percentage: number;
  members: { userId: string; name: string }[];
}

const MAX_ATTACH = 6;
const MAX_FILE_MB = 2.4;

const REACTION_OPTIONS = [
  { key: "heart", emoji: "❤️", label: "Love" },
  { key: "thumbs", emoji: "👍", label: "Like" },
  { key: "fire", emoji: "🔥", label: "Fire" },
  { key: "clap", emoji: "👏", label: "Clap" },
  { key: "laugh", emoji: "😂", label: "Funny" },
] as const;

function PostImage({ url, alt }: { url: string; alt: string }) {
  const isData = url.startsWith("data:");
  if (isData) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={alt}
        className="rounded-lg max-h-72 w-full object-cover border border-white/10"
      />
    );
  }
  return (
    <div className="relative w-full max-h-72 rounded-lg overflow-hidden border border-white/10 aspect-video">
      <Image
        src={url}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 640px"
        unoptimized={url.includes("supabase")}
      />
    </div>
  );
}

export function ExploreFeedTab() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [stats, setStats] = useState<InterestStat[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [headline, setHeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState("");
  const [feedQuery, setFeedQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<string | null>(null);
  const [replyDeleting, setReplyDeleting] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const [pr, sr] = await Promise.all([
          fetch("/api/explore/posts", { credentials: "include" }),
          opts?.silent
            ? Promise.resolve({ json: async () => ({}) })
            : fetch("/api/explore/interest-stats"),
        ]);
        const pj = await pr.json();
        if (pj.success) {
          setPosts(pj.data || []);
          setViewerId(
            typeof pj.viewerId === "string" ? pj.viewerId : null
          );
        }
        if (!opts?.silent) {
          const sj = await sr.json();
          if (sj.success && sj.data) {
            setStats(sj.data.stats || []);
            setTotalUsers(sj.data.totalUsers || 0);
            setHeadline(sj.data.headline ?? null);
          }
        }
      } catch {
        if (!opts?.silent) {
          toast({
            variant: "destructive",
            title: "Could not load feed",
          });
        }
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load();
  }, [load]);

  const filteredPosts = useMemo(() => {
    const q = feedQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      const name = (p.authorName || "").toLowerCase();
      const inReplies = (p.replies || []).some((r) =>
        (r.content || "").toLowerCase().includes(q)
      );
      return (
        p.content.toLowerCase().includes(q) ||
        name.includes(q) ||
        inReplies
      );
    });
  }, [posts, feedQuery]);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;
    const next: File[] = [...pendingFiles];
    for (let i = 0; i < list.length && next.length < MAX_ATTACH; i++) {
      const f = list[i];
      if (!f.type.startsWith("image/")) continue;
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        toast({ title: `${f.name} is too large (max ${MAX_FILE_MB}MB)` });
        continue;
      }
      next.push(f);
    }
    setPendingFiles(next);
    e.target.value = "";
  }

  async function handlePost() {
    const content = draft.trim();
    if (!content && pendingFiles.length === 0) return;
    if (!content) {
      toast({ title: "Add some text to your post" });
      return;
    }
    setPosting(true);
    try {
      const imageUrls: string[] = [];
      for (const file of pendingFiles) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/explore/upload", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const uj = await up.json();
        if (!uj.success || !uj.url) {
          toast({
            variant: "destructive",
            title: uj.error || "Image upload failed",
          });
          setPosting(false);
          return;
        }
        imageUrls.push(uj.url);
      }

      const res = await fetch("/api/explore/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, imageUrls }),
      });
      const j = await res.json();
      if (j.success && j.data) {
        setPosts((prev) => [j.data, ...prev]);
        setDraft("");
        setPendingFiles([]);
        toast({ title: "Posted to the feed" });
      } else {
        toast({
          variant: "destructive",
          title: j.error || "Could not post",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "Could not post" });
    } finally {
      setPosting(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/explore/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await res.json();
      if (j.success) {
        setPosts((p) => p.filter((x) => x.id !== postId));
        toast({ title: "Post deleted" });
      } else {
        toast({
          variant: "destructive",
          title: j.error || "Could not delete",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "Could not delete" });
    }
  }

  async function toggleReaction(postId: string, key: string) {
    if (!viewerId) {
      toast({ title: "Sign in to react" });
      return;
    }
    const post = posts.find((p) => p.id === postId);
    const was = post?.myReaction;
    try {
      if (was === key) {
        const res = await fetch(`/api/explore/posts/${postId}/reactions`, {
          method: "DELETE",
          credentials: "include",
        });
        const j = await res.json();
        if (!j.success) throw new Error(j.error);
      } else {
        const res = await fetch(`/api/explore/posts/${postId}/reactions`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction: key }),
        });
        const j = await res.json();
        if (!j.success) throw new Error(j.error);
      }
      await load({ silent: true });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not update reaction",
      });
    }
  }

  async function deleteReply(postId: string, replyId: string) {
    if (!confirm("Delete this reply?")) return;
    setReplyDeleting(replyId);
    try {
      const res = await fetch(
        `/api/explore/posts/${postId}/replies/${replyId}`,
        { method: "DELETE", credentials: "include" }
      );
      const j = await res.json();
      if (j.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  replies: (p.replies || []).filter((r) => r.id !== replyId),
                }
              : p
          )
        );
        toast({ title: "Reply deleted" });
      } else {
        toast({
          variant: "destructive",
          title: j.error || "Could not delete reply",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "Could not delete reply" });
    } finally {
      setReplyDeleting(null);
    }
  }

  async function sendReply(postId: string) {
    const text = (replyDraft[postId] || "").trim();
    if (!text) return;
    setReplySending(postId);
    try {
      const res = await fetch(`/api/explore/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: text }),
      });
      const j = await res.json();
      if (j.success && j.data) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, replies: [...(p.replies || []), j.data] }
              : p
          )
        );
        setReplyDraft((d) => ({ ...d, [postId]: "" }));
        toast({ title: "Reply posted" });
      } else {
        toast({
          variant: "destructive",
          title: j.error || "Could not reply",
        });
      }
    } catch {
      toast({ variant: "destructive", title: "Could not reply" });
    } finally {
      setReplySending(null);
    }
  }

  const topThree = stats.slice(0, 3);
  const restStats = stats.slice(3);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-7xl mx-auto w-full">
      <div className="flex-1 min-w-0 space-y-6 order-2 lg:order-1">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            Share with the community
          </h2>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What are you looking to discuss or learn about?"
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg bg-black/50 border border-white/15 text-white placeholder:text-white/40 p-3 text-sm resize-y min-h-[5rem] focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {pendingFiles.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="relative h-16 w-16 rounded-lg overflow-hidden border border-white/20 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(f)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingFiles((p) => p.filter((_, j) => j !== i))
                    }
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onPickFiles}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingFiles.length >= MAX_ATTACH || posting}
                onClick={() => fileInputRef.current?.click()}
                className="border-white/20 text-white/80 hover:bg-white/10"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Attach images ({pendingFiles.length}/{MAX_ATTACH})
              </Button>
            </div>
            <Button
              type="button"
              disabled={posting || (!draft.trim() && pendingFiles.length === 0)}
              onClick={() => void handlePost()}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400"
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            value={feedQuery}
            onChange={(e) => setFeedQuery(e.target.value)}
            placeholder="Search posts, replies, or authors..."
            className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/40"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <p className="text-center text-white/50 py-12">
            {posts.length === 0
              ? "No posts yet. Be the first to share!"
              : "No posts match your search."}
          </p>
        ) : (
          <ul className="space-y-4">
            {filteredPosts.map((post) => {
              const name = post.authorName || "Member";
              const initials = name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const imgs = post.imageUrls || [];
              const replies = post.replies || [];
              const showReply = replyOpen === post.id;

              return (
                <li
                  key={post.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Link href={`/user/${post.userId}`}>
                        <Avatar className="h-10 w-10 border border-white/10 shrink-0">
                          <AvatarImage src={undefined} />
                          <AvatarFallback className="bg-cyan-500/20 text-cyan-300 text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              href={`/user/${post.userId}`}
                              className="font-medium text-white hover:text-cyan-400"
                            >
                              {name}
                            </Link>
                            <p className="text-xs text-white/40">
                              {new Date(post.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {viewerId && post.userId === viewerId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-white/35 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Delete post"
                              onClick={() => void handleDeletePost(post.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-white/85 mt-2 whitespace-pre-wrap">
                          {post.content}
                        </p>
                      </div>
                    </div>
                    {imgs.length > 0 && (
                      <div
                        className={cn(
                          "grid gap-2",
                          imgs.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        )}
                      >
                        {imgs.map((url, i) => (
                          <PostImage
                            key={i}
                            url={url}
                            alt={`Attachment ${i + 1}`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                      <span className="text-[11px] text-white/35 uppercase tracking-wide w-full sm:w-auto sm:mr-1">
                        React
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {REACTION_OPTIONS.map(({ key, emoji, label }) => {
                          const count = post.reactionCounts?.[key] ?? 0;
                          const active = post.myReaction === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              title={
                                viewerId
                                  ? active
                                    ? `Remove ${label}`
                                    : label
                                  : "Sign in to react"
                              }
                              disabled={!viewerId}
                              onClick={() => void toggleReaction(post.id, key)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-colors",
                                active
                                  ? "bg-cyan-500/20 border-cyan-500/45 shadow-sm shadow-cyan-500/10"
                                  : "border-white/12 bg-white/[0.03] hover:bg-white/10",
                                !viewerId && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <span aria-hidden>{emoji}</span>
                              {count > 0 && (
                                <span className="text-xs font-medium text-white/75 tabular-nums">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setReplyOpen(showReply ? null : post.id)
                        }
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {replies.length > 0
                          ? `${replies.length} repl${replies.length === 1 ? "y" : "ies"}`
                          : "Reply"}
                        {showReply ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                      {replies.length > 0 && (
                        <ul className="space-y-2 pl-2 border-l-2 border-cyan-500/25">
                          {replies.map((r) => {
                            const isMine = Boolean(
                              viewerId && r.userId === viewerId
                            );
                            return (
                              <li
                                key={r.id}
                                className="text-sm group/reply relative pr-8"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <span className="font-medium text-cyan-300/90">
                                      {r.authorName || "Member"}
                                    </span>
                                    <span className="text-white/35 text-xs ml-2">
                                      {new Date(r.createdAt).toLocaleString()}
                                    </span>
                                    <p className="text-white/75 mt-0.5 whitespace-pre-wrap">
                                      {r.content}
                                    </p>
                                  </div>
                                  {isMine && (
                                    <button
                                      type="button"
                                      title="Delete reply"
                                      disabled={replyDeleting === r.id}
                                      onClick={() =>
                                        void deleteReply(post.id, r.id)
                                      }
                                      className="shrink-0 p-1 rounded-md text-white/30 hover:text-red-400 hover:bg-red-500/10 opacity-70 sm:opacity-0 sm:group-hover/reply:opacity-100 transition-opacity disabled:opacity-40"
                                      aria-label="Delete reply"
                                    >
                                      {replyDeleting === r.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {showReply && (
                        <div className="flex flex-col gap-2 pt-1">
                          <textarea
                            value={replyDraft[post.id] || ""}
                            onChange={(e) =>
                              setReplyDraft((d) => ({
                                ...d,
                                [post.id]: e.target.value,
                              }))
                            }
                            placeholder="Write a reply…"
                            rows={2}
                            maxLength={1500}
                            className="w-full rounded-lg bg-black/40 border border-white/15 text-white text-sm p-2 resize-y focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !(
                                replyDraft[post.id] || ""
                              ).trim() || replySending === post.id
                            }
                            onClick={() => void sendReply(post.id)}
                            className="self-end bg-teal-600 hover:bg-teal-500 text-white"
                          >
                            {replySending === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Send reply"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside className="w-full lg:w-[22rem] flex-shrink-0 space-y-4 order-1 lg:order-2">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 via-black to-teal-950/30 p-5 shadow-lg shadow-cyan-900/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">
              Network pulse
            </h2>
          </div>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300">
            {totalUsers} member{totalUsers !== 1 ? "s" : ""}
          </p>
          {headline && (
            <p className="text-sm text-white/70 mt-3 leading-relaxed border-l-2 border-cyan-500/50 pl-3">
              {headline}
            </p>
          )}
          {topThree.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
                Top shared interests
              </p>
              {topThree.map((s, idx) => (
                <div
                  key={s.interest}
                  className={cn(
                    "relative rounded-xl p-3 border transition-transform hover:scale-[1.02]",
                    idx === 0
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/30"
                      : idx === 1
                        ? "bg-white/5 border-white/15"
                        : "bg-white/[0.03] border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="relative h-12 w-12 shrink-0 rounded-full grid place-items-center"
                      style={{
                        background: `conic-gradient(rgb(34 211 238) ${Math.min(100, s.percentage) * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                      }}
                    >
                      <div className="h-9 w-9 rounded-full bg-zinc-950 flex items-center justify-center text-xs font-bold text-cyan-300">
                        {s.percentage}%
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-bold px-1.5 py-0.5 rounded",
                            idx === 0
                              ? "bg-amber-500/30 text-amber-200"
                              : "bg-white/10 text-white/60"
                          )}
                        >
                          #{idx + 1}
                        </span>
                        <span className="font-medium text-white truncate">
                          {s.interest}
                        </span>
                      </div>
                      <p className="text-xs text-white/45 mt-0.5">
                        {s.count} of {totalUsers} members
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-teal-400" />
            More in common
          </h2>
          <ul className="space-y-3">
            {restStats.map((s) => {
              const isOpen = expanded === s.interest;
              return (
                <li key={s.interest} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-teal-200"
                      style={{
                        background: `conic-gradient(rgb(45 212 191) ${Math.min(100, s.percentage) * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                      }}
                    >
                      <span className="h-6 w-6 rounded-full bg-zinc-950 flex items-center justify-center">
                        {s.percentage}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-white/90 truncate block">
                        {s.interest}
                      </span>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500"
                          style={{
                            width: `${Math.min(100, s.percentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-white/40 pl-10">
                    {s.count} member{s.count !== 1 ? "s" : ""} share this
                  </p>
                  {(s.members?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(isOpen ? null : s.interest)
                      }
                      className="mt-1 ml-10 text-xs text-teal-400 hover:underline flex items-center gap-1"
                    >
                      {isOpen ? (
                        <>
                          Hide who <ChevronUp className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          See who <ChevronDown className="h-3 w-3" />
                        </>
                      )}
                    </button>
                  )}
                  {isOpen && s.members && (
                    <ul className="mt-2 ml-10 pl-2 space-y-1 border-l border-white/10">
                      {s.members.map((m) => (
                        <li key={m.userId}>
                          <Link
                            href={`/user/${m.userId}`}
                            className="text-xs text-white/70 hover:text-teal-400"
                          >
                            {m.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {stats.length === 0 && !loading && (
            <p className="text-xs text-white/40">
              Register more members to see shared interests.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
