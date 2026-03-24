import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export const metadata = {
  title: "Create Account | GS26",
  description: "Create your GS26 conference account (powered by JYNX) and start networking with leaders",
};

export default function RegisterPage() {
  const ssoForce = process.env.SSO_FORCE === "true";

  if (ssoForce) {
    return (
      <Card className="w-full max-w-md animate-fade-in summit-card border-white/10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display text-white">Account Registration</CardTitle>
          <CardDescription className="text-white/60">
            Accounts are created automatically through corporate SSO
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-white/50">
            <Link
              href="/login"
              className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
            >
              Sign in with SSO
            </Link>{" "}
            to access the leadership network. Your account will be created on first login.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md animate-fade-in summit-card border-white/10">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display text-white">Create Your Account</CardTitle>
        <CardDescription className="text-white/60">
          Join the leadership network and discover meaningful connections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-96 shimmer rounded-lg" />}>
          <RegisterForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
          >
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

