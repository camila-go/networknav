"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizeActivityTag,
  suggestActivityTagFromPersonalInterest,
} from "@/lib/profile/activity-tag";
import { MAX_PROFILE_GALLERY_PHOTOS } from "@/lib/profile-gallery";
import { cn } from "@/lib/utils";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024;

async function readApiJson(res: Response): Promise<{ success?: boolean; error?: string; data?: unknown }> {
  const text = await res.text();
  try {
    return JSON.parse(text) as { success?: boolean; error?: string; data?: unknown };
  } catch {
    return {
      success: false,
      error:
        text.trim().slice(0, 180) ||
        `Server returned ${res.status} (not JSON). Check Network tab.`,
    };
  }
}

function isHeicLike(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

/** MIME we can upload (must match `/api/profile/photos/upload-url`). */
function resolveUploadMime(file: File): string | null {
  if (file.type === "image/jpg" || file.type === "image/pjpeg") return "image/jpeg";
  if (ALLOWED_TYPES.includes(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  // iOS / Android often send JPEG/PNG as empty type or octet-stream with no extension.
  if (
    (!file.type || file.type === "application/octet-stream") &&
    !isHeicLike(file) &&
    file.size > 0
  ) {
    return "image/jpeg";
  }
  return null;
}

function isBinaryImageGuess(file: File): boolean {
  return !file.type || file.type === "application/octet-stream";
}

/** Try preview for anything plausibly from the photo picker (incl. bogus mobile MIME). */
function canPreviewImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (isBinaryImageGuess(file)) return !isHeicLike(file);
  return resolveUploadMime(file) !== null;
}

interface PersonalInterestPhotoStepProps {
  personalInterestText: string;
  disabled: boolean;
  onSkip: () => void;
  onUploaded: () => void;
}

export function PersonalInterestPhotoStep({
  personalInterestText,
  disabled: _wizardInputLocked,
  onSkip,
  onUploaded,
}: PersonalInterestPhotoStepProps) {
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pickedSummary, setPickedSummary] = useState<string | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const tagInputRef = useRef(tagInput);
  tagInputRef.current = tagInput;
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTagInput(suggestActivityTagFromPersonalInterest(personalInterestText));
  }, [personalInterestText]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  function setLocalPreview(file: File | null) {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    if (file) {
      const url = URL.createObjectURL(file);
      previewObjectUrlRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  const runUpload = useCallback(async (file: File, mimeType: string) => {
    setError(null);
    const normalized = normalizeActivityTag(tagInputRef.current);
    if (!normalized) {
      setError("Add a short activity label first (e.g. gardening).");
      return;
    }

    setUploading(true);
    try {
      const urlResponse = await fetch("/api/profile/photos/upload-url", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: mimeType, fileSize: file.size }),
      });
      const urlResult = await readApiJson(urlResponse);
      if (!urlResult.success) {
        setError(
          urlResult.error ??
            (urlResponse.status === 401
              ? "You must be logged in to upload. Try logging in again."
              : urlResponse.status === 503
                ? "Photo storage isn’t configured (Supabase service role / bucket). Use Skip or configure .env."
                : "Could not start upload")
        );
        return;
      }

      const payload = urlResult.data as {
        signedUrl: string;
        storageKey: string;
        photoId: string;
      };
      const { signedUrl, storageKey, photoId } = payload;
      if (!signedUrl || !storageKey || !photoId) {
        setError("Invalid response from upload server.");
        return;
      }

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": mimeType },
      });
      if (!putRes.ok) {
        setError(`Upload to storage failed (${putRes.status}). Try again or use Skip.`);
        return;
      }

      const confirmRes = await fetch("/api/profile/photos", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey,
          photoId,
          activityTag: normalized,
          caption: normalized,
        }),
      });
      const confirm = await readApiJson(confirmRes);
      if (!confirm.success) {
        setError(confirm.error ?? `Could not save photo (HTTP ${confirmRes.status}).`);
        return;
      }

      setPhotoSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  const onFileChange = useCallback(
    (input: HTMLInputElement) => {
      const file = input.files?.[0];
      if (!file) return;

      const summary =
        file.name?.trim() ||
        `${file.type || "file"} · ${(file.size / 1024).toFixed(0)} KB`;
      setPickedSummary(summary);
      setError(null);

      if (file.size > MAX_SIZE) {
        setError("Max file size is 10 MB.");
        input.value = "";
        return;
      }
      if (!canPreviewImage(file)) {
        setLocalPreview(null);
        setError("Choose an image file (JPG, PNG, WebP, or GIF).");
        input.value = "";
        return;
      }
      setLocalPreview(file);

      const mime = resolveUploadMime(file);
      if (!mime) {
        setError(
          isHeicLike(file)
            ? "HEIC/HEIF photos can’t be uploaded yet. Export as JPEG or PNG (e.g. in Photos: Duplicate as JPG)."
            : "Use JPG, PNG, WebP, or GIF."
        );
        input.value = "";
        return;
      }
      void runUpload(file, mime);
      input.value = "";
    },
    [runUpload]
  );

  // WebKit / some extensions omit React’s onChange for type=file; native listener still fires.
  useEffect(() => {
    const el = fileInputRef.current;
    if (!el) return undefined;
    const handler = () => onFileChange(el);
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, [onFileChange, photoSaved, uploading]);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-4 space-y-4">
      <p className="text-xs text-zinc-400">
        Optional: add a photo for your profile and the community gallery. You can
        also add up to {MAX_PROFILE_GALLERY_PHOTOS} activity photos anytime from{" "}
        <span className="text-zinc-300 font-medium">Profile</span> in the nav.
        Use the <span className="text-zinc-300 font-medium">file button</span>{" "}
        below (opens Photos / Files on your device). JPEG, PNG, WebP, or GIF.
        After it saves, tap{" "}
        <span className="text-zinc-300">Continue to next question</span>. No
        photo? <span className="text-zinc-300">Skip photo — next question</span>.
      </p>

      <div className="space-y-2">
        <Label htmlFor="activity-chip" className="text-zinc-300">
          Activity label
        </Label>
        <Input
          id="activity-chip"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="e.g. gardening"
          disabled={uploading}
          className="bg-zinc-950 border-zinc-700 text-white"
          maxLength={48}
        />
      </div>

      {previewUrl && (
        <div
          className={`rounded-lg overflow-hidden bg-zinc-950 border transition-colors duration-300 ${
            photoSaved
              ? "border-emerald-500/70 ring-2 ring-emerald-500/25"
              : "border-zinc-600"
          }`}
        >
          <div
            className={`flex items-center gap-1.5 px-2 py-1.5 border-b text-[11px] font-medium ${
              photoSaved
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : uploading
                  ? "border-zinc-700 bg-zinc-900/80 text-zinc-400"
                  : "border-zinc-700 text-zinc-500"
            }`}
          >
            {photoSaved ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
                <span>Photo attached · saved to your profile</span>
              </>
            ) : uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-zinc-400" aria-hidden />
                <span>Uploading…</span>
              </>
            ) : (
              <span>Selected photo</span>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img
            src={previewUrl}
            alt=""
            className="w-full max-h-56 object-contain min-h-[120px]"
          />
        </div>
      )}

      {pickedSummary && !previewUrl && (
        <p className="text-xs text-zinc-500">File received: {pickedSummary}</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!photoSaved && (
        <p className="text-[11px] text-cyan-300/80">
          {uploading
            ? "Upload in progress…"
            : "Use your browser’s file button below (e.g. “Choose file”). Extensions like Grammarly can block custom pickers — try Incognito if nothing happens."}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/*
          Native &lt;input type="file"&gt; with styled ::file-selector-button.
          Overlays and synthetic clicks often fail on iOS / with extensions (content-all.js).
        */}
        {photoSaved ? (
          <div className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-full border-2 border-emerald-500/50 bg-emerald-950/40 px-4 text-sm font-semibold text-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            Photo saved
          </div>
        ) : uploading ? (
          <div className="inline-flex h-11 min-h-[44px] items-center gap-2 rounded-full border-2 border-white/25 bg-zinc-900 px-5 text-sm font-semibold text-white">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            Uploading…
          </div>
        ) : (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif"
            aria-label="Choose activity photo from your device"
            className={cn(
              "block w-full min-w-0 cursor-pointer text-sm text-zinc-500 file:cursor-pointer sm:w-auto",
              "file:mr-3 file:inline-flex file:h-11 file:min-h-[44px] file:items-center file:justify-center file:gap-2 file:rounded-full file:border-2 file:border-white/25 file:bg-zinc-900 file:px-5 file:text-base file:font-semibold file:text-white file:shadow-sm",
              "hover:file:border-cyan-400/50 focus-visible:file:outline-none focus-visible:file:ring-2 focus-visible:file:ring-cyan-500/60"
            )}
          />
        )}
        <Button
          type="button"
          variant="ghost"
          disabled={uploading || photoSaved}
          onClick={onSkip}
          className="text-zinc-400 hover:text-white"
        >
          Skip photo — next question
        </Button>
      </div>

      {photoSaved && (
        <div className="space-y-2 rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3">
          <p className="text-sm text-emerald-200">
            Photo saved to your profile. When you’re ready, go to the next
            question.
          </p>
          <Button
            type="button"
            onClick={() => onUploaded()}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-medium hover:from-cyan-400 hover:to-teal-400"
          >
            Continue to next question
          </Button>
        </div>
      )}
    </div>
  );
}
