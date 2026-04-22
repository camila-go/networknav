"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Check, X, ChevronUp, ChevronDown, Loader2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { normalizeActivityTag } from "@/lib/profile/activity-tag";
import type { UserPhoto } from "@/types";

interface PhotoGalleryProps {
  userId: string;
  isOwner: boolean;
  /** When true, wraps output in the standard card container with a heading */
  withContainer?: boolean;
  containerClassName?: string;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_PHOTOS = 12;

export function PhotoGallery({ userId, isOwner, withContainer = false, containerClassName }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingCaption, setEditingCaption] = useState<{
    id: string;
    value: string;
    activityTag: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploadActivityTag, setUploadActivityTag] = useState("");
  const [editingTagError, setEditingTagError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Latest activity label at confirm time (upload is async; avoids stale closure). */
  const uploadActivityTagRef = useRef("");
  useEffect(() => {
    uploadActivityTagRef.current = uploadActivityTag;
  }, [uploadActivityTag]);

  const fetchPhotos = useCallback(async () => {
    try {
      const url = isOwner
        ? "/api/profile/photos"
        : `/api/users/${userId}/photos`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setPhotos(result.data.photos);
      }
    } catch (error) {
      console.error("Failed to fetch photos:", error);
    } finally {
      setLoading(false);
    }
  }, [isOwner, userId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      else if (e.key === "ArrowRight") navigateLightbox(1);
      else if (e.key === "Escape") setLightboxIndex(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, photos.length]);

  function navigateLightbox(dir: -1 | 1) {
    setLightboxIndex(prev => {
      if (prev === null) return null;
      return (prev + dir + photos.length) % photos.length;
    });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!normalizeActivityTag(uploadActivityTag)) {
      setUploadError(
        "Add an activity label first. It’s required so your photo can appear in the community gallery and search (e.g. kayaking, cooking)."
      );
      e.target.value = "";
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Invalid file type. Use JPG, PNG, WebP, or GIF.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("File too large. Maximum size is 10 MB.");
      e.target.value = "";
      return;
    }

    uploadPhoto(file);
    e.target.value = "";
  }

  async function uploadPhoto(file: File) {
    if (!normalizeActivityTag(uploadActivityTag)) {
      setUploadError(
        "Add a valid activity label (e.g. kayaking) before adding a photo. It’s required for the community gallery and search."
      );
      return;
    }
    setUploading(true);
    try {
      // Step 1: Get signed upload URL from server
      const urlResponse = await fetch("/api/profile/photos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
      });
      const urlResult = await urlResponse.json();

      if (!urlResult.success) {
        setUploadError(urlResult.error ?? "Upload failed");
        return;
      }

      // Step 2: Upload file directly to Supabase Storage
      const { signedUrl, storageKey, photoId } = urlResult.data;
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        setUploadError("Upload failed. Please try again.");
        return;
      }

      // Step 3: Confirm upload and create DB record (API requires activity tag)
      const confirmResponse = await fetch("/api/profile/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey,
          photoId,
          activityTag: uploadActivityTag,
        }),
      });
      const confirmResult = await confirmResponse.json();

      if (confirmResult.success) {
        setPhotos(prev => [...prev, confirmResult.data.photo]);
      } else {
        setUploadError(confirmResult.error ?? "Upload failed");
      }
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(photoId: string) {
    if (confirmDelete !== photoId) {
      setConfirmDelete(photoId);
      // Auto-clear confirm state after 3 seconds
      setTimeout(() => setConfirmDelete(prev => prev === photoId ? null : prev), 3000);
      return;
    }
    setConfirmDelete(null);

    // Optimistic remove
    setPhotos(prev => prev.filter(p => p.id !== photoId));

    try {
      await fetch(`/api/profile/photos/${photoId}`, { method: "DELETE" });
    } catch (error) {
      console.error("Delete failed:", error);
      fetchPhotos(); // Re-sync on failure
    }
  }

  async function saveCaption(photoId: string, caption: string, activityTag: string) {
    if (!normalizeActivityTag(activityTag)) {
      setEditingTagError(
        "Activity label is required. Use a short label (e.g. kayaking) so this photo can appear in the community gallery and search."
      );
      return;
    }
    setEditingTagError(null);

    try {
      const res = await fetch(`/api/profile/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim() || null,
          activityTag,
        }),
      });
      const result = await res.json();
      if (result.success && result.data?.photo) {
        setEditingCaption(null);
        setEditingTagError(null);
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? result.data.photo : p))
        );
      } else {
        setEditingTagError(
          typeof result.error === "string"
            ? result.error
            : "Could not save. Check the activity label."
        );
      }
    } catch (error) {
      console.error("Caption save failed:", error);
      setEditingTagError("Could not save. Try again.");
      fetchPhotos();
    }
  }

  async function reorder(index: number, dir: -1 | 1) {
    const targetIndex = index + dir;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const photoA = photos[index];
    const photoB = photos[targetIndex];
    const orderA = photoA.displayOrder;
    const orderB = photoB.displayOrder;

    // Optimistic update
    const newPhotos = [...photos];
    newPhotos[index] = { ...photoA, displayOrder: orderB };
    newPhotos[targetIndex] = { ...photoB, displayOrder: orderA };
    // Re-sort by displayOrder
    newPhotos.sort((a, b) => a.displayOrder - b.displayOrder);
    setPhotos(newPhotos);

    try {
      await Promise.all([
        fetch(`/api/profile/photos/${photoA.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: orderB }),
        }),
        fetch(`/api/profile/photos/${photoB.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayOrder: orderA }),
        }),
      ]);
    } catch (error) {
      console.error("Reorder failed:", error);
      fetchPhotos();
    }
  }

  // Hide entirely if empty and not owner
  if (!loading && photos.length === 0 && !isOwner) return null;

  const inner = (
    <div className="space-y-4">
      {isOwner && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <label
                htmlFor="gallery-upload-activity"
                className="text-[11px] font-medium uppercase tracking-wide text-amber-200/90"
              >
                Activity label <span className="text-red-400">*</span>{" "}
                <span className="font-normal normal-case text-white/50">(required for each photo)</span>
              </label>
              <input
                id="gallery-upload-activity"
                type="text"
                maxLength={48}
                value={uploadActivityTag}
                onChange={(e) => {
                  setUploadActivityTag(e.target.value);
                  setUploadError(null);
                }}
                required
                autoComplete="off"
                disabled={uploading || photos.length >= MAX_PHOTOS}
                placeholder="e.g. kayaking, fishing, cooking"
                className="w-full max-w-sm rounded-md border border-amber-500/30 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
              />
              <p className="text-[11px] text-white/50">
                Every photo must have a label so you show up in the community gallery, activity search,
                and on your profile as a clear chip. Add the label <span className="text-amber-200/90">before</span> you
                click Add Photo.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm text-white/50 sm:mr-2">
                {photos.length} / {MAX_PHOTOS} photos
              </span>
              {uploadError && (
                <span className="text-xs text-red-400 max-w-[14rem] sm:max-w-xs">{uploadError}</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  uploading ||
                  photos.length >= MAX_PHOTOS ||
                  !normalizeActivityTag(uploadActivityTag)
                }
                onClick={() => {
                  setUploadError(null);
                  if (!normalizeActivityTag(uploadActivityTag)) {
                    setUploadError(
                      "Type an activity label first. It’s required (e.g. hiking, design)."
                    );
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                title={
                  !normalizeActivityTag(uploadActivityTag)
                    ? "Add an activity label in the field above first"
                    : undefined
                }
                className="border-white/20 text-white/80 hover:bg-white/10"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {uploading ? "Uploading..." : "Add Photo"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-white/30">
          <Image className="h-10 w-10 mb-2" />
          <p className="text-sm">No photos yet</p>
          {isOwner && <p className="text-xs mt-1">Add photos to share your journey</p>}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((photo, index) => {
            const chipLabel = photo.activityTag?.trim();
            return (
            <div key={photo.id} className="group relative aspect-square">
              {/* Thumbnail */}
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                className="relative w-full h-full rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? `Photo ${index + 1}`}
                  className="w-full h-full object-cover select-none transition-opacity group-hover:opacity-80"
                />
                {chipLabel ? (
                  <span className="pointer-events-none absolute bottom-1 left-1 right-1 z-[2] flex justify-start">
                    <Badge
                      variant="secondary"
                      className="max-w-full justify-start rounded-md border-0 bg-black/85 px-1.5 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wide text-cyan-200 shadow-md [overflow-wrap:anywhere] leading-snug"
                    >
                      {chipLabel}
                    </Badge>
                  </span>
                ) : null}
              </button>

              {/* Owner controls overlay */}
              {isOwner && (
                <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  {/* Top-right: delete */}
                  <button
                    type="button"
                    onClick={() => deletePhoto(photo.id)}
                    className={`absolute top-1 right-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                      confirmDelete === photo.id
                        ? "bg-red-600 text-white"
                        : "bg-black/70 text-white/80 hover:bg-red-600 hover:text-white"
                    }`}
                    title={confirmDelete === photo.id ? "Click again to confirm" : "Delete photo"}
                  >
                    <Trash2 className="h-3 w-3" />
                    {confirmDelete === photo.id && <span>Confirm</span>}
                  </button>

                  {/* Top-left: reorder arrows */}
                  <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => reorder(index, -1)}
                        className="bg-black/70 text-white/80 hover:bg-white/20 rounded p-0.5"
                        title="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                    )}
                    {index < photos.length - 1 && (
                      <button
                        type="button"
                        onClick={() => reorder(index, 1)}
                        className="bg-black/70 text-white/80 hover:bg-white/20 rounded p-0.5"
                        title="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Bottom: caption edit */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCaption({
                        id: photo.id,
                        value: photo.caption ?? "",
                        activityTag: photo.activityTag?.trim() ?? "",
                      });
                    }}
                    className="absolute bottom-1 left-1 right-1 bg-black/70 text-white/70 hover:text-white rounded px-1.5 py-0.5 text-xs flex items-center gap-1 truncate"
                    title="Edit caption"
                  >
                    <Pencil className="h-3 w-3 shrink-0" />
                    <span className="truncate">{photo.caption || "Add caption"}</span>
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Caption editing modal */}
      {editingCaption && (
        <div className="space-y-2 rounded-lg border border-amber-500/20 bg-white/5 p-3">
          <p className="text-[11px] text-amber-200/80">
            Photo activity label <span className="text-red-400">*</span> — required for the gallery; caption is
            optional.
          </p>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={editingCaption.value}
              maxLength={120}
              onChange={(e) =>
                setEditingCaption((prev) =>
                  prev ? { ...prev, value: e.target.value } : null
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  saveCaption(
                    editingCaption.id,
                    editingCaption.value,
                    editingCaption.activityTag
                  );
                if (e.key === "Escape") {
                  setEditingCaption(null);
                  setEditingTagError(null);
                }
              }}
              placeholder="Caption (optional)..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
            />
            <button
              type="button"
              onClick={() =>
                saveCaption(
                  editingCaption.id,
                  editingCaption.value,
                  editingCaption.activityTag
                )
              }
              className="text-cyan-400 hover:text-cyan-300"
              aria-label="Save"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingCaption(null);
                setEditingTagError(null);
              }}
              className="text-white/40 hover:text-white/70"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium uppercase tracking-wide text-amber-200/80">
              Activity label <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              maxLength={48}
              value={editingCaption.activityTag}
              onChange={(e) => {
                setEditingTagError(null);
                setEditingCaption((prev) =>
                  prev ? { ...prev, activityTag: e.target.value } : null
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  saveCaption(
                    editingCaption.id,
                    editingCaption.value,
                    editingCaption.activityTag
                  );
              }}
              placeholder="e.g. kayaking, design, cooking"
              className="w-full max-w-sm rounded-md border border-amber-500/30 bg-zinc-950/60 px-3 py-1.5 text-xs text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {editingTagError && (
              <p className="text-xs text-red-400" role="alert">
                {editingTagError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => { if (!open) setLightboxIndex(null); }}>
        <DialogContent className="max-w-4xl w-full bg-black/95 border-white/10 p-0">
          {lightboxIndex !== null && photos[lightboxIndex] && (
            <div className="relative flex flex-col items-center">
              {/* Navigation buttons */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => navigateLightbox(-1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateLightbox(1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              {/* Image */}
              <img
                src={photos[lightboxIndex].url}
                alt={photos[lightboxIndex].caption ?? `Photo ${lightboxIndex + 1}`}
                className="max-h-[80vh] max-w-full object-contain rounded-t-lg"
              />

              {/* Caption + counter */}
              <div className="w-full px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {photos[lightboxIndex].activityTag?.trim() ? (
                    <Badge className="shrink-0 border-cyan-500/40 bg-cyan-950/80 text-cyan-200">
                      {photos[lightboxIndex].activityTag!.trim()}
                    </Badge>
                  ) : null}
                  <p className="text-sm text-white/70">
                    {photos[lightboxIndex].caption || ""}
                  </p>
                </div>
                <p className="text-xs text-white/40 shrink-0">
                  {lightboxIndex + 1} / {photos.length}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  if (!withContainer) return inner;

  return (
    <div className={containerClassName ?? "rounded-xl bg-white/5 border border-white/10 p-6"}>
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Photos</h2>
      </div>
      {inner}
    </div>
  );
}
