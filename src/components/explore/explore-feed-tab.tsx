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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ExploreReply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName?: string;
  authorPhotoUrl?: string | null;
  reactionCounts?: Record<string, number>;
  myReaction?: string | null;
}

interface ExplorePost {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  authorName?: string;
  authorEmail?: string | null;
  authorPhotoUrl?: string | null;
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

/** Rounded value + small “%” on second line so long decimals never collide with the ring */
function DonutPercentLabel({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const n = Math.min(100, Math.max(0, Math.round(Number(value))));
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center tabular-nums leading-none px-1 max-w-full min-w-0",
        className
      )}
    >
      <span
        className={cn(
          "font-bold leading-none tracking-tight",
          n >= 100 ? "text-[9px]" : "text-[11px]"
        )}
      >
        {n}
      </span>
      <span className="text-[7px] font-semibold opacity-85 leading-none -mt-px">
        %
      </span>
    </div>
  );
}

function NetworkPulseCard({
  layout,
  className,
  totalUsers,
  headline,
  topThree,
}: {
  layout: "horizontal" | "vertical";
  className?: string;
  totalUsers: number;
  headline: string | null;
  topThree: InterestStat[];
}) {
  const interestCards = topThree.map((s, idx) => (
    <div
      key={s.interest}
      className={cn(
        "relative rounded-xl p-2.5 sm:p-3 border transition-transform hover:scale-[1.02]",
        idx === 0
          ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-500/30"
          : idx === 1
            ? "bg-white/5 border-white/15"
            : "bg-white/[0.03] border-white/10",
        layout === "horizontal" && "snap-start shrink-0 w-[min(82vw,280px)] sm:w-[260px]"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className="relative h-[3.25rem] w-[3.25rem] shrink-0 rounded-full grid place-items-center"
          style={{
            background: `conic-gradient(rgb(34 211 238) ${Math.min(100, s.percentage) * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
          }}
        >
          <div className="h-10 w-10 rounded-full bg-zinc-950 flex items-center justify-center text-cyan-300 min-w-0">
            <DonutPercentLabel value={s.percentage} />
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
            <span className="font-medium text-white truncate">{s.interest}</span>
          </div>
          <p className="text-xs text-white/45 mt-0.5">
            {s.count} of {totalUsers} members
          </p>
        </div>
      </div>
    </div>
  ));

  return (
    <div
      className={cn(
        "rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 via-black to-teal-950/30 p-4 sm:p-5 shadow-lg shadow-cyan-900/10",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
        <TrendingUp className="h-5 w-5 text-cyan-400 shrink-0" />
        <h2 className="text-base font-semibold text-white">Network pulse</h2>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300">
        {totalUsers} member{totalUsers !== 1 ? "s" : ""}
      </p>
      {headline && (
        <p className="text-sm text-white/70 mt-2 sm:mt-3 leading-relaxed border-l-2 border-cyan-500/50 pl-3">
          {headline}
        </p>
      )}
      {topThree.length > 0 &&
        (layout === "horizontal" ? (
          <div className="mt-3 sm:mt-4">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
              Top shared interests
            </p>
            <div className="overflow-x-auto pb-1 -mx-1 px-1 scroll-smooth overscroll-x-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
              <div className="flex gap-3 snap-x snap-mandatory w-max pr-1">
                {interestCards}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 sm:mt-5 space-y-2 sm:space-y-3">
            <p className="text-xs font-medium text-white/40 uppercase tracking-wider">
              Top shared interests
            </p>
            {interestCards}
          </div>
        ))}
    </div>
  );
}

function formatInterestTitle(raw: string) {
  return raw
    .split(/[-_]/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

function InterestMembersModal({
  stat,
  open,
  onClose,
  totalUsers,
}: {
  stat: InterestStat | undefined;
  open: boolean;
  onClose: () => void;
  totalUsers: number;
}) {
  const members = stat?.members ?? [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[min(88vh,540px)] gap-0 overflow-hidden border-white/10 bg-[#0a1628] p-0 sm:max-w-md">
        {stat && (
          <>
            <DialogHeader className="space-y-2 px-6 pb-3 pt-6 pr-14 text-left">
              <DialogTitle className="text-lg font-semibold text-white">
                {formatInterestTitle(stat.interest)}
              </DialogTitle>
              <DialogDescription className="text-sm text-white/60">
                {stat.count} member{stat.count !== 1 ? "s" : ""} share this
                {totalUsers > 0 && (
                  <>
                    {" "}
                    · {Math.round(stat.percentage)}% of{" "}
                    {totalUsers} member{totalUsers !== 1 ? "s" : ""}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[min(320px,52vh)] overflow-y-auto overscroll-contain px-6 pb-6">
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.userId}>
                    <Link
                      href={`/user/${m.userId}`}
                      onClick={() => onClose()}
                      className="block rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-white/90 transition-colors hover:border-teal-500/35 hover:bg-teal-500/10 hover:text-teal-200"
                    >
                      {m.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MoreInCommonSection({
  layout,
  className,
  restStats,
  onOpenMembers,
  statsLength,
  loading,
}: {
  layout: "scroll" | "stack";
  className?: string;
  restStats: InterestStat[];
  onOpenMembers: (interest: string) => void;
  statsLength: number;
  loading: boolean;
}) {
  const showEmptyHint = statsLength === 0 && !loading;

  const renderStatBlock = (s: InterestStat, opts: { inScrollStrip: boolean }) => {
    return (
      <div
        className={cn(
          "text-sm",
          opts.inScrollStrip &&
            "snap-start shrink-0 w-[min(82vw,260px)] rounded-xl border border-white/10 bg-black/20 p-3"
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="relative h-[3.25rem] w-[3.25rem] shrink-0 rounded-full grid place-items-center"
            style={{
              background: `conic-gradient(rgb(45 212 191) ${Math.min(100, s.percentage) * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
            }}
          >
            <div className="h-10 w-10 rounded-full bg-zinc-950 flex items-center justify-center text-teal-200 min-w-0">
              <DonutPercentLabel value={s.percentage} />
            </div>
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
        <p
          className={cn(
            "text-[11px] text-white/40",
            opts.inScrollStrip ? "pl-0" : "ps-[3.75rem]"
          )}
        >
          {s.count} member{s.count !== 1 ? "s" : ""} share this
        </p>
        {(s.members?.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => onOpenMembers(s.interest)}
            className={cn(
              "mt-1 text-xs font-medium text-teal-400 hover:text-teal-300 hover:underline",
              opts.inScrollStrip ? "" : "ms-[3.75rem]"
            )}
          >
            See who
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4",
        className
      )}
    >
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-2 sm:mb-3">
        <Users className="h-4 w-4 text-teal-400" />
        More in common
      </h2>
      {layout === "scroll" ? (
        restStats.length === 0 ? (
          showEmptyHint && (
            <p className="text-xs text-white/40">
              Register more members to see shared interests.
            </p>
          )
        ) : (
          <div className="overflow-x-auto pb-1 -mx-1 px-1 scroll-smooth overscroll-x-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
            <div className="flex gap-3 snap-x snap-mandatory w-max pr-1">
              {restStats.map((s) => (
                <div key={s.interest} className="snap-start shrink-0">
                  {renderStatBlock(s, { inScrollStrip: true })}
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <>
          <ul className="space-y-3">
            {restStats.map((s) => (
              <li key={s.interest} className="text-sm">
                {renderStatBlock(s, { inScrollStrip: false })}
              </li>
            ))}
          </ul>
          {statsLength === 0 && !loading && (
            <p className="text-xs text-white/40">
              Register more members to see shared interests.
            </p>
          )}
        </>
      )}
    </div>
  );
}

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
  const [seeWhoInterest, setSeeWhoInterest] = useState<string | null>(null);
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
      const inReplies = (p.replies || []).some(
        (r) =>
          (r.content || "").toLowerCase().includes(q) ||
          (r.authorName || "").toLowerCase().includes(q)
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

  async function toggleReplyReaction(replyId: string, key: string) {
    if (!viewerId) {
      toast({ title: "Sign in to react" });
      return;
    }
    const reply = posts.flatMap((p) => p.replies || []).find((r) => r.id === replyId);
    const was = reply?.myReaction;
    try {
      if (was === key) {
        const res = await fetch(`/api/explore/replies/${replyId}/reactions`, {
          method: "DELETE",
          credentials: "include",
        });
        const j = await res.json();
        if (!j.success) throw new Error(j.error);
      } else {
        const res = await fetch(`/api/explore/replies/${replyId}/reactions`, {
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

  function beginReplyToAuthor(postId: string, authorName: string) {
    setReplyOpen(postId);
    const tag = `@${authorName.trim() || "Member"} `;
    setReplyDraft((d) => {
      const prev = (d[postId] || "").trim();
      if (!prev) return { ...d, [postId]: tag };
      if (prev.startsWith("@")) return { ...d, [postId]: prev };
      return { ...d, [postId]: `${tag}\n\n${prev}` };
    });
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
  const hideMobileMoreInCommon = restStats.length === 0 && stats.length > 0;

  const membersModalStat = useMemo(() => {
    if (!seeWhoInterest) return undefined;
    return restStats.find((s) => s.interest === seeWhoInterest);
  }, [seeWhoInterest, restStats]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 p-3 pt-2 sm:p-4 max-w-7xl mx-auto w-full">
      <NetworkPulseCard
        layout="horizontal"
        className="lg:hidden shrink-0"
        totalUsers={totalUsers}
        headline={headline}
        topThree={topThree}
      />

      {!hideMobileMoreInCommon && (
        <MoreInCommonSection
          layout="scroll"
          className="lg:hidden shrink-0"
          restStats={restStats}
          onOpenMembers={setSeeWhoInterest}
          statsLength={stats.length}
          loading={loading}
        />
      )}

      <div className="flex-1 min-w-0 space-y-4 sm:space-y-6 order-2 lg:order-1">
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
                      <Link href={`/user/${post.userId}`} className="shrink-0">
                        <Avatar className="h-10 w-10 border border-white/10">
                          <AvatarImage src={photo} alt="" />
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
                            const rName = r.authorName || "Member";
                            const rPhoto = r.authorPhotoUrl?.trim() || undefined;
                            const rInitials = rName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();
                            return (
                              <li
                                key={r.id}
                                className="text-sm group/reply relative pr-2 sm:pr-8"
                              >
                                <div className="flex items-start gap-2">
                                  <Link
                                    href={`/user/${r.userId}`}
                                    className="shrink-0 mt-0.5"
                                  >
                                    <Avatar className="h-8 w-8 border border-white/10">
                                      <AvatarImage src={rPhoto} alt="" />
                                      <AvatarFallback className="bg-teal-500/25 text-teal-200 text-[10px]">
                                        {rInitials}
                                      </AvatarFallback>
                                    </Avatar>
                                  </Link>
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <Link
                                          href={`/user/${r.userId}`}
                                          className="font-medium text-cyan-300/90 hover:text-cyan-200"
                                        >
                                          {rName}
                                        </Link>
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
                                          className="shrink-0 p-1 rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 opacity-70 sm:opacity-0 sm:group-hover/reply:opacity-100 transition-opacity disabled:opacity-40"
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
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[10px] text-white/30 uppercase tracking-wide">
                                        React
                                      </span>
                                      {REACTION_OPTIONS.map(({ key, emoji, label }) => {
                                        const count = r.reactionCounts?.[key] ?? 0;
                                        const active = r.myReaction === key;
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
                                            onClick={() =>
                                              void toggleReplyReaction(r.id, key)
                                            }
                                            className={cn(
                                              "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-colors",
                                              active
                                                ? "bg-teal-500/20 border-teal-500/40"
                                                : "border-white/10 bg-white/[0.03] hover:bg-white/10",
                                              !viewerId && "opacity-50 cursor-not-allowed"
                                            )}
                                          >
                                            <span aria-hidden>{emoji}</span>
                                            {count > 0 && (
                                              <span className="text-[10px] font-medium text-white/70 tabular-nums">
                                                {count}
                                              </span>
                                            )}
                                          </button>
                                        );
                                      })}
                                      <button
                                        type="button"
                                        disabled={!viewerId}
                                        onClick={() =>
                                          beginReplyToAuthor(post.id, rName)
                                        }
                                        className={cn(
                                          "text-[11px] font-medium text-cyan-400 hover:text-cyan-300 ml-1",
                                          !viewerId && "opacity-50 cursor-not-allowed"
                                        )}
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
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

      <aside className="w-full lg:w-[22rem] flex-shrink-0 space-y-3 sm:space-y-4 order-3 lg:order-2">
        <NetworkPulseCard
          layout="vertical"
          className="hidden lg:block"
          totalUsers={totalUsers}
          headline={headline}
          topThree={topThree}
        />

        <MoreInCommonSection
          layout="stack"
          className="hidden lg:block"
          restStats={restStats}
          onOpenMembers={setSeeWhoInterest}
          statsLength={stats.length}
          loading={loading}
        />
      </aside>

      <InterestMembersModal
        stat={membersModalStat}
        open={Boolean(membersModalStat)}
        onClose={() => setSeeWhoInterest(null)}
        totalUsers={totalUsers}
      />
    </div>
  );
}
