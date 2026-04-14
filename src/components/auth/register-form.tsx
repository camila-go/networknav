"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const password = watch("password", "");

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  async function onSubmit(data: RegisterInput) {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      let result: {
        success?: boolean;
        error?: string;
        details?: unknown;
        data?: { user?: { questionnaireCompleted?: boolean } };
      };
      try {
        result = await response.json();
      } catch {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: "Invalid response from server. Check the console and try again.",
        });
        return;
      }

      if (!response.ok || !result.success) {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: result.error || `Request failed (${response.status}). Please try again.`,
        });
        return;
      }

      toast({
        variant: "success",
        title: "Account created!",
        description: "A few quick questions so we can match you well…",
      });

      router.push("/onboarding");
      router.refresh();
    } catch (error) {
      console.error("Registration error:", error);
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
        <Label htmlFor="name" className="text-white/80">Full Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="Jane Smith"
          autoComplete="name"
          {...register("name")}
          className={cn(inputStyles, errors.name && "border-red-500/50")}
        />
        {errors.name && (
          <p className="text-sm text-red-400">{errors.name.message}</p>
        )}
      </div>

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
        <Label htmlFor="title" className="text-white/80">Title</Label>
        <Input
          id="title"
          type="text"
          placeholder="VP of Product"
          {...register("title")}
          className={cn(inputStyles, errors.title && "border-red-500/50")}
        />
        {errors.title && (
          <p className="text-sm text-red-400">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="company" className="text-white/80">
          Company <span className="text-white/40">(Optional)</span>
        </Label>
        <Input
          id="company"
          type="text"
          placeholder="Acme Inc."
          {...register("company")}
          className={inputStyles}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-white/80">Password</Label>
        <div className="flex gap-2">
          <Input
            id="password"
            placeholder="••••••••"
            autoComplete="new-password"
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

        {/* Password strength indicators - always visible */}
        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
          <PasswordRequirement met={hasMinLength}>
            8+ characters
          </PasswordRequirement>
          <PasswordRequirement met={hasUppercase}>
            Uppercase letter
          </PasswordRequirement>
          <PasswordRequirement met={hasLowercase}>
            Lowercase letter
          </PasswordRequirement>
          <PasswordRequirement met={hasNumber}>
            Number
          </PasswordRequirement>
        </div>

        {errors.password && (
          <p className="text-sm text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-white/80">Confirm Password</Label>
        <div className="flex gap-2">
          <Input
            id="confirmPassword"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register("confirmPassword")}
            className={cn(inputStyles, "flex-1", errors.confirmPassword && "border-red-500/50")}
            type={showConfirmPassword ? "text" : "password"}
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            aria-pressed={showConfirmPassword}
            className="relative z-10 inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full bg-white/5 border border-white/20 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={() => setShowConfirmPassword((v) => !v)}
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-400">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      <p className="text-xs text-center text-white/40">
        By creating an account, you agree to our{" "}
        <a href="/terms" className="text-cyan-400 hover:text-cyan-300 hover:underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 hover:underline">
          Privacy Policy
        </a>
      </p>
    </form>
  );
}

function PasswordRequirement({
  met,
  children,
}: {
  met: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        met ? "text-cyan-400" : "text-white/40"
      )}
    >
      {met ? (
        <Check className="h-3 w-3" />
      ) : (
        <X className="h-3 w-3" />
      )}
      {children}
    </div>
  );
}

