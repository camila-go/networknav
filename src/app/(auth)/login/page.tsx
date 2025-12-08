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
  title: "Log In | NetworkNav",
  description: "Log in to your NetworkNav account",
};

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display">Welcome Back</CardTitle>
        <CardDescription>
          Log in to connect with your leadership network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-64 shimmer rounded-lg" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-primary hover:underline font-medium"
          >
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

