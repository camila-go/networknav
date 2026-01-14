import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export const metadata = {
  title: "Log In | Jynx",
  description: "Log in to your Jynx account",
};

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md animate-fade-in summit-card border-white/10">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display text-white">Welcome Back</CardTitle>
        <CardDescription className="text-white/60">
          Log in to connect with your leadership network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-64 shimmer rounded-lg" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-white/50">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

