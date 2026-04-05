"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  ssoForce?: boolean;
}

export function LoginForm({ ssoForce = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  // Show SSO error if redirected back from a failed SSO attempt
  useEffect(() => {
    if (searchParams.get("error") === "sso_failed") {
      toast({
        variant: "destructive",
        title: "SSO login failed",
        description: searchParams.get("message") || "Please try again",
      });
    }
  }, [searchParams, toast]);

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
        credentials: "include",
        body: JSON.stringify(data),
      });

      let result: {
        success?: boolean;
        error?: string;
        data?: { user?: { questionnaireCompleted?: boolean } };
      };
      try {
        result = await response.json();
      } catch {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid response from server. Check the console and try again.",
        });
        return;
      }

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: result.error || `Request failed (${response.status}). Please check your credentials.`,
        });
        return;
      }

      const questionnaireDone =
        result.data?.user?.questionnaireCompleted === true;

      toast({
        variant: "success",
        title: "Welcome back!",
        description: questionnaireDone
          ? "Redirecting to your dashboard…"
          : "Let’s finish your profile questions…",
      });

      router.push(
        questionnaireDone ? "/dashboard" : "/onboarding"
      );
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

  const ssoButtonClass =
    "h-12 w-full rounded-full border-0 bg-white font-semibold text-black shadow-sm hover:bg-white/95";

  if (ssoForce) {
    return (
      <div className="space-y-4">
        <Button asChild className={ssoButtonClass} size="lg">
          <a href="/api/auth/sso/login">
            <Shield className="mr-2 h-5 w-5 text-black" aria-hidden />
            Sign in with Corporate SSO
          </a>
        </Button>
        <p className="text-center text-sm text-white/40">
          Authentication is managed by your organization
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button asChild className="w-full" size="lg">
        <a href="/api/auth/sso/login">
          <Shield className="mr-2 h-5 w-5" aria-hidden />
          Sign in with Corporate SSO
        </a>
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#0a1628] px-2 text-white/40">or</span>
        </div>
      </div>

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
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
              className={cn(inputStyles, "flex-1", errors.password && "border-red-500/50")}
              type={showPassword ? "text" : "password"}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="relative z-10 inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/20 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onClick={() => setShowPassword((v) => !v)}
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
    </div>
  );
}
