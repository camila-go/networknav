"use client";

import { useEffect, useState, useCallback, useId } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModerationItem, ModerationStatus } from "@/types";

const PHOTO_TYPE_BADGE =
  "border-fuchsia-500/35 bg-fuchsia-950/70 text-fuchsia-100";

const REASON_COLORS: Record<string, string> = {
  auto_flagged: "border-red-500/40 bg-red-950/70 text-red-100",
  user_report: "border-amber-500/40 bg-amber-950/70 text-amber-100",
  manual_review: "border-white/20 bg-zinc-900/80 text-zinc-100",
};

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const idPrefix = useId();

  const pageSize = 20;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: statusFilter,
      });

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
  }, [page, statusFilter]);

  useEffect(() => {
    void fetchItems();
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
  const selectAllId = `${idPrefix}-select-all`;
  const tabTriggerClass =
    "press border-0 bg-transparent shadow-none ring-0 text-white/60 px-3 text-sm transition-all duration-200 ease-out data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_rgba(34,211,238,0.55)] data-[state=inactive]:shadow-none";
  const paginationBtnClass =
    "min-h-11 border-2 border-white/25 bg-white/5 text-white hover:bg-white/15 hover:border-white/40 sm:min-h-9";

  return (
    <section
      aria-labelledby="moderation-heading"
      className="min-w-0 w-full max-w-full"
    >
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1
          id="moderation-heading"
          className="font-display min-w-0 text-3xl font-bold text-white"
        >
          Gallery photo review
        </h1>
        {total > 0 && statusFilter === "pending" && (
          <Badge
            variant="secondary"
            className="w-fit shrink-0 border border-amber-400/45 bg-amber-950/60 text-sm text-amber-100"
          >
            {total} pending
          </Badge>
        )}
      </div>

      <div className="mb-4 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
              setSelected(new Set());
            }}
          >
            <TabsList className="inline-flex h-auto rounded-xl bg-white/5 p-1">
              <TabsTrigger value="pending" className={tabTriggerClass}>
                Pending
              </TabsTrigger>
              <TabsTrigger value="all" className={tabTriggerClass}>
                All
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {selected.size > 0 && (
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            <span className="text-sm text-white/60">{selected.size} selected</span>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:w-auto">
              <Button
                size="sm"
                variant="success"
                className="min-h-11 w-full justify-center sm:min-h-9 sm:w-auto"
                onClick={() => handleBulkAction("approved")}
                disabled={actionLoading === "bulk"}
              >
                <CheckCircle className="mr-1 h-4 w-4 shrink-0" aria-hidden />
                Approve All
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="min-h-11 w-full justify-center sm:min-h-9 sm:w-auto"
                onClick={() => handleBulkAction("deleted")}
                disabled={actionLoading === "bulk"}
              >
                <Trash2 className="mr-1 h-4 w-4 shrink-0" aria-hidden />
                Remove All
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-white/50">Loading...</div>
      ) : items.length === 0 ? (
        <Card className="border-white/10 bg-white/5 p-12 text-center">
          <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-400/50" aria-hidden />
          <p className="text-lg text-white/60">Queue is clear</p>
          <p className="mt-1 text-sm text-white/45">No gallery photos to review</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {statusFilter === "pending" && items.length > 1 && (
            <div className="flex items-center gap-2 px-1">
              <input
                id={selectAllId}
                type="checkbox"
                checked={selected.size === items.length}
                onChange={toggleSelectAll}
                className="size-4 shrink-0 accent-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              />
              <label
                htmlFor={selectAllId}
                className="cursor-pointer text-xs text-white/50"
              >
                Select all on this page
              </label>
            </div>
          )}

          {items.map((item) => {
            const isSelected = selected.has(item.id);
            const isPending = item.status === "pending";

            return (
              <Card
                key={item.id}
                className={cn(
                  "border-white/10 bg-white/5 p-4 transition-colors",
                  isSelected && "border-cyan-500/40 bg-cyan-500/5"
                )}
              >
                <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    {isPending && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        aria-label={`Select queue item for ${item.userName}`}
                        className="mt-1 size-4 shrink-0 accent-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                      />
                    )}

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-medium">
                      {item.userName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <a
                          href={`/user/${item.userId}`}
                          className="font-medium text-white transition-colors hover:text-cyan-400"
                        >
                          {item.userName}
                        </a>
                        <Badge
                          variant="secondary"
                          className={cn("border text-xs", PHOTO_TYPE_BADGE)}
                        >
                          <ImageIcon className="mr-1 h-3 w-3" aria-hidden />
                          Gallery photo
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={cn("border text-xs", REASON_COLORS[item.reason])}
                        >
                          {item.reason === "auto_flagged" && (
                            <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                          )}
                          {item.reason.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-white/45">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="mt-2 rounded-lg bg-white/[0.03] p-3">
                        <p className="whitespace-pre-wrap break-words text-sm text-white/70">
                          {item.contentSnapshot || "(no caption or tag)"}
                        </p>
                        {item.imageUrl && (
                          <div className="mt-2">
                            <Image
                              src={item.imageUrl}
                              alt="Gallery photo pending review"
                              width={800}
                              height={600}
                              sizes="(max-width: 768px) 100vw, 400px"
                              className="max-h-48 w-auto rounded border border-white/10"
                            />
                          </div>
                        )}
                      </div>

                      {item.status !== "pending" && (
                        <div className="mt-2 text-xs text-white/45">
                          <StatusBadge status={item.status as ModerationStatus} />
                          {item.reviewerNotes && (
                            <span className="ml-2">Note: {item.reviewerNotes}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {isPending && (
                    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap md:w-auto md:shrink-0">
                      <Button
                        size="sm"
                        variant="success"
                        className="min-h-11 w-full justify-center sm:min-h-9 sm:w-auto"
                        onClick={() => handleAction(item.id, "approved")}
                        disabled={actionLoading === item.id}
                        title="Approve (keep content)"
                      >
                        <CheckCircle className="mr-1 h-4 w-4 shrink-0" aria-hidden />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="min-h-11 w-full justify-center sm:min-h-9 sm:w-auto"
                        onClick={() => handleAction(item.id, "deleted")}
                        disabled={actionLoading === item.id}
                        title="Remove (delete content)"
                      >
                        <Trash2 className="mr-1 h-4 w-4 shrink-0" aria-hidden />
                        Remove
                      </Button>
                      <Button
                        size="sm"
                        variant="warning"
                        className="min-h-11 w-full justify-center sm:min-h-9 sm:w-auto"
                        onClick={() => handleAction(item.id, "rejected")}
                        disabled={actionLoading === item.id}
                        title="Warn (remove + send warning)"
                      >
                        <XCircle className="mr-1 h-4 w-4 shrink-0" aria-hidden />
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

      {totalPages > 1 && (
        <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">{total} items total</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className={paginationBtnClass}
            >
              Previous
            </Button>
            <span className="flex min-w-[4rem] items-center justify-center px-2 text-sm text-white/50">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className={paginationBtnClass}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  const config: Record<ModerationStatus, { label: string; className: string }> = {
    pending: {
      label: "Pending",
      className: "border-amber-400/45 bg-amber-950/60 text-amber-100",
    },
    approved: {
      label: "Approved",
      className: "border-emerald-500/40 bg-emerald-950/70 text-emerald-100",
    },
    rejected: {
      label: "Warned",
      className: "border-red-500/40 bg-red-950/70 text-red-100",
    },
    deleted: {
      label: "Removed",
      className: "border-red-500/40 bg-red-950/70 text-red-100",
    },
  };
  const c = config[status];
  return (
    <Badge variant="secondary" className={cn("border text-xs", c.className)}>
      {c.label}
    </Badge>
  );
}
