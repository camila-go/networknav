"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { profileSchema, type ProfileInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    watch,
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

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const response = await fetch("/api/auth/me");
      const result = await response.json();

      if (result.success) {
        reset({
          name: result.data.user.profile.name,
          position: result.data.user.profile.position,
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
        <Avatar className="h-20 w-20 border-2 border-white/20">
          <AvatarImage src={watch("photoUrl")} />
          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-black text-xl font-semibold">
            {initials || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Label htmlFor="photoUrl" className="text-white/80">Photo URL</Label>
          <Input
            id="photoUrl"
            type="url"
            placeholder="https://example.com/photo.jpg"
            {...register("photoUrl")}
            className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
          />
          <p className="text-xs text-white/50 mt-1">
            Enter a URL to your profile photo
          </p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-white/80">Full Name</Label>
        <Input
          id="name"
          {...register("name")}
          className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 ${errors.name ? "border-red-500" : ""}`}
        />
        {errors.name && (
          <p className="text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

      {/* Position & Title */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="position" className="text-white/80">Position</Label>
          <Input
            id="position"
            {...register("position")}
            className={`bg-white/5 border-white/20 text-white placeholder:text-white/40 ${errors.position ? "border-red-500" : ""}`}
          />
          {errors.position && (
            <p className="text-sm text-red-400">{errors.position.message}</p>
          )}
        </div>

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
        className="bg-gradient-to-r from-cyan-500 to-teal-500 text-black hover:from-cyan-400 hover:to-teal-400 disabled:opacity-50"
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
