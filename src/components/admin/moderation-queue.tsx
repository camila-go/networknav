"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Image,
  User,
  FileText,
  Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModerationItem, ModerationContentType, ModerationStatus } from "@/types";

const CONTENT_TYPE_ICONS: Record<ModerationContentType, typeof FileText> = {
  post: FileText,
  reply: Reply,
  message: MessageSquare,
  profile: User,
  photo: Image,
};

const CONTENT_TYPE_COLORS: Record<ModerationContentType, string> = {
  post: "bg-blue-500/10 text-blue-400",
  reply: "bg-purple-500/10 text-purple-400",
  message: "bg-green-500/10 text-green-400",
  profile: "bg-cyan-500/10 text-cyan-400",
  photo: "bg-pink-500/10 text-pink-400",
};

const REASON_COLORS: Record<string, string> = {
  auto_flagged: "bg-red-500/10 text-red-400",
  user_report: "bg-amber-500/10 text-amber-400",
  manual_review: "bg-white/10 text-white/60",
};

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pageSize = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: statusFilter,
      });
      if (contentTypeFilter) params.set("contentType", contentTypeFilter);

      const res = await fetch(`/api/admin/moderation?${params}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setTotal(json.data.total);
      }
    } catch (e) {
      console.error("Failed to fetch moderation queue:", e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, contentTypeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleAction(
    itemId: string,
    status: "approved" | "rejected" | "deleted"
  ) {
    setActionLoading(itemId);
    try {
      const res = await fetch(`/api/admin/moderation/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setTotal((t) => t - 1);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBulkAction(status: "approved" | "rejected" | "deleted") {
    if (selected.size === 0) return;
    setActionLoading("bulk");
    try {
      const res = await fetch("/api/admin/moderation/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: Array.from(selected), status }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => prev.filter((i) => !selected.has(i.id)));
        setTotal((t) => t - selected.size);
        setSelected(new Set());
      }
    } finally {
      setActionLoading(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Content Moderation</h1>
        {total > 0 && statusFilter === "pending" && (
          <Badge className="bg-amber-500/10 text-amber-400 text-sm">
            {total} pending
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Tabs
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1); setSelected(new Set()); }}
        >
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">
              Pending
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={contentTypeFilter || "all_types"}
          onValueChange={(v) => { setContentTypeFilter(v === "all_types" ? "" : v); setPage(1); }}
        >
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_types">All types</SelectItem>
            <SelectItem value="post">Posts</SelectItem>
            <SelectItem value="reply">Replies</SelectItem>
            <SelectItem value="message">Messages</SelectItem>
            <SelectItem value="profile">Profiles</SelectItem>
            <SelectItem value="photo">Photos</SelectItem>
          </SelectContent>
        </Select>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-white/50">{selected.size} selected</span>
            <Button
              size="sm"
              variant="ghost"
              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
              onClick={() => handleBulkAction("approved")}
              disabled={actionLoading === "bulk"}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => handleBulkAction("deleted")}
              disabled={actionLoading === "bulk"}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove All
            </Button>
          </div>
        )}
      </div>

      {/* Items */}
      {loading ? (
        <div className="text-center py-12 text-white/40">Loading...</div>
      ) : items.length === 0 ? (
        <Card className="bg-white/5 border-white/10 p-12 text-center">
          <CheckCircle className="h-12 w-12 mx-auto text-green-400/50 mb-3" />
          <p className="text-white/60 text-lg">Queue is clear</p>
          <p className="text-white/30 text-sm mt-1">No items to review</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Select all checkbox */}
          {statusFilter === "pending" && items.length > 1 && (
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={selected.size === items.length}
                onChange={toggleSelectAll}
                className="accent-cyan-500"
              />
              <span className="text-xs text-white/40">Select all on this page</span>
            </div>
          )}

          {items.map((item) => {
            const Icon = CONTENT_TYPE_ICONS[item.contentType] || FileText;
            const isSelected = selected.has(item.id);
            const isPending = item.status === "pending";

            return (
              <Card
                key={item.id}
                className={cn(
                  "bg-white/5 border-white/10 p-4 transition-colors",
                  isSelected && "border-cyan-500/40 bg-cyan-500/5"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox for pending items */}
                  {isPending && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className="accent-cyan-500 mt-1"
                    />
                  )}

                  {/* User avatar */}
                  <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium shrink-0">
                    {item.userName.charAt(0).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <a
                        href={`/user/${item.userId}`}
                        className="font-medium text-white hover:text-cyan-400 transition-colors"
                      >
                        {item.userName}
                      </a>
                      <Badge className={cn("text-xs capitalize", CONTENT_TYPE_COLORS[item.contentType])}>
                        <Icon className="h-3 w-3 mr-1" />
                        {item.contentType}
                      </Badge>
                      <Badge className={cn("text-xs", REASON_COLORS[item.reason])}>
                        {item.reason === "auto_flagged" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {item.reason.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-white/30">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Content snapshot */}
                    <div className="bg-white/[0.03] rounded-lg p-3 mt-2">
                      <p className="text-sm text-white/70 whitespace-pre-wrap break-words">
                        {item.contentSnapshot || "(no text content)"}
                      </p>
                      {item.imageUrl && (
                        <div className="mt-2">
                          <img
                            src={item.imageUrl}
                            alt="Flagged content"
                            className="max-h-48 rounded border border-white/10"
                          />
                        </div>
                      )}
                    </div>

                    {/* Reviewer info (for reviewed items) */}
                    {item.status !== "pending" && (
                      <div className="mt-2 text-xs text-white/30">
                        <StatusBadge status={item.status as ModerationStatus} />
                        {item.reviewerNotes && (
                          <span className="ml-2">Note: {item.reviewerNotes}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons (only for pending) */}
                  {isPending && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-9 px-3"
                        onClick={() => handleAction(item.id, "approved")}
                        disabled={actionLoading === item.id}
                        title="Approve (keep content)"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 px-3"
                        onClick={() => handleAction(item.id, "deleted")}
                        disabled={actionLoading === item.id}
                        title="Remove (delete content)"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-9 px-3"
                        onClick={() => handleAction(item.id, "rejected")}
                        disabled={actionLoading === item.id}
                        title="Warn (remove + send warning)"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Warn
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-white/40">{total} items total</p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-white/60"
            >
              Previous
            </Button>
            <span className="text-sm text-white/40 flex items-center px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-white/60"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  const config: Record<ModerationStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-amber-500/10 text-amber-400" },
    approved: { label: "Approved", className: "bg-green-500/10 text-green-400" },
    rejected: { label: "Warned", className: "bg-red-500/10 text-red-400" },
    deleted: { label: "Removed", className: "bg-red-500/10 text-red-400" },
  };
  const c = config[status];
  return <Badge className={cn("text-xs", c.className)}>{c.label}</Badge>;
}
