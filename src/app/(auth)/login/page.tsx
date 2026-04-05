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

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Log In | GS26",
  description: "Log in to your GS26 conference account (powered by JYNX)",
};

export default function LoginPage() {
  const ssoForce = process.env.SSO_FORCE?.trim() === "true";

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
          <LoginForm ssoForce={ssoForce} />
        </Suspense>
        {!ssoForce && (
          <>
            <p className="mt-6 text-center text-sm text-white/50">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
              >
                Create one
              </Link>
            </p>
            <p className="mt-3 text-center text-sm text-white/40">
              <Link
                href="/welcome"
                className="text-white/50 hover:text-cyan-400/90 hover:underline"
              >
                Event info &amp; how it works
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

