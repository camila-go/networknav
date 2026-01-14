"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: result.error || "Please check your credentials",
        });
        return;
      }

      toast({
        variant: "success",
        title: "Welcome back!",
        description: "Redirecting to your dashboard...",
      });

      // Redirect based on questionnaire completion
      if (result.data.user.questionnaireCompleted) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Please try again later",
      });
    }
  }

  const inputStyles = "bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-cyan-500/50 focus:ring-cyan-500/20";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-white/80">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          {...register("email")}
          className={cn(inputStyles, errors.email && "border-red-500/50")}
        />
        {errors.email && (
          <p className="text-sm text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-white/80">Password</Label>
          <a
            href="/forgot-password"
            className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            Forgot password?
          </a>
        </div>
        <div className="flex gap-2">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            {...register("password")}
            className={cn(inputStyles, "flex-1", errors.password && "border-red-500/50")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="px-3 rounded-lg bg-white/5 border border-white/20 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Logging in...
          </>
        ) : (
          "Log In"
        )}
      </Button>
    </form>
  );
}

