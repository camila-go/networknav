"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Camera, X } from "lucide-react";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  });

  const name = watch("name", "");
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Revoke object URL on cleanup to avoid memory leaks
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      const result = await response.json();

      if (result.success) {
        reset({
          name: result.data.user.profile.name,
          title: result.data.user.profile.title,
          company: result.data.user.profile.company || "",
          location: result.data.user.profile.location || "",
          photoUrl: result.data.user.profile.photoUrl || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Invalid file type. Use JPG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError("File too large. Maximum size is 10 MB.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    uploadAvatar(file);

    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      // Step 1: Get signed upload URL from server
      const urlResponse = await fetch("/api/profile/avatar/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
      });

      const urlResult = await urlResponse.json();
      if (!urlResult.success) {
        setAvatarError(urlResult.error ?? "Upload failed");
        setAvatarPreview(null);
        return;
      }

      // Step 2: Upload file directly to Supabase Storage
      const { signedUrl, storageKey } = urlResult.data;
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        setAvatarError("Upload failed. Please try again.");
        setAvatarPreview(null);
        return;
      }

      // Step 3: Confirm upload and update DB
      const confirmResponse = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey }),
      });

      const confirmResult = await confirmResponse.json();

      if (confirmResult.success) {
        setValue("photoUrl", confirmResult.data.photoUrl, { shouldDirty: false });
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
        toast({ variant: "success", title: "Photo updated" });
      } else {
        setAvatarError(confirmResult.error ?? "Upload failed");
        setAvatarPreview(null);
      }
    } catch {
      setAvatarError("Upload failed. Please try again.");
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function removeAvatar() {
    setValue("photoUrl", "", { shouldDirty: false });
    setAvatarPreview(null);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: watch("name"),
          title: watch("title"),
          company: watch("company"),
          location: watch("location"),
          photoUrl: "",
        }),
      });
    } catch {
      // Non-blocking
    }
  }

  async function onSubmit(data: ProfileInput) {
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: "Profile updated",
          description: "Your changes have been saved.",
        });
        reset(data);
      } else {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: result.error || "Please try again.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again later.",
      });
    }
  }

  if (isLoading) {
    return <div className="h-64 bg-white/5 animate-pulse rounded-lg" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar className="h-20 w-20 border-2 border-white/20">
            <AvatarImage src={avatarPreview ?? watch("photoUrl")} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black text-xl font-semibold">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarSelect}
            className="hidden"
          />
          {/* Keep photoUrl registered as hidden for form submission */}
          <input type="hidden" {...register("photoUrl")} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={uploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            className="border-white/20 text-white/80 hover:bg-white/10"
          >
            <Camera className="mr-2 h-4 w-4" />
            {uploadingAvatar ? "Uploading..." : "Change Photo"}
          </Button>
          {watch("photoUrl") && !uploadingAvatar && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={removeAvatar}
              className="text-white/50 hover:text-white/80 hover:bg-white/5"
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
          {avatarError && (
            <p className="text-xs text-red-400">{avatarError}</p>
          )}
          <p className="text-xs text-white/40">JPG, PNG, WebP or GIF · max 10 MB</p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white/80">Full name</Label>
        <Input
          id="name"
          {...register("name")}
          className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 ${errors.name ? "border-red-500" : ""}`}
        />
        {errors.name && (
          <p className="text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-white/80">Title</Label>
        <Input
          id="title"
          {...register("title")}
          className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 ${errors.title ? "border-red-500" : ""}`}
        />
        {errors.title && (
          <p className="text-sm text-red-400">{errors.title.message}</p>
        )}
      </div>

      {/* Company */}
      <div className="space-y-2">
        <Label htmlFor="company" className="text-white/80">
          Company <span className="text-white/40">(Optional)</span>
        </Label>
        <Input 
          id="company" 
          {...register("company")} 
          className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-white/80">
          Location <span className="text-white/40">(Optional)</span>
        </Label>
        <Input
          id="location"
          placeholder="San Francisco, CA"
          {...register("location")}
          className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
        />
      </div>

      <Button 
        type="submit" 
        disabled={isSubmitting || !isDirty}
        className="disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </form>
  );
}
