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
    return <div className="h-64 shimmer rounded-lg" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={watch("photoUrl")} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-teal-500 text-white text-xl">
            {initials || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Label htmlFor="photoUrl">Photo URL</Label>
          <Input
            id="photoUrl"
            type="url"
            placeholder="https://example.com/photo.jpg"
            {...register("photoUrl")}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter a URL to your profile photo
          </p>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Position & Title */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            {...register("position")}
            className={errors.position ? "border-destructive" : ""}
          />
          {errors.position && (
            <p className="text-sm text-destructive">{errors.position.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...register("title")}
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>
      </div>

      {/* Company */}
      <div className="space-y-2">
        <Label htmlFor="company">
          Company <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <Input id="company" {...register("company")} />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">
          Location <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <Input
          id="location"
          placeholder="San Francisco, CA"
          {...register("location")}
        />
      </div>

      <Button type="submit" disabled={isSubmitting || !isDirty}>
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

