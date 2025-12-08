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
  title: "Create Account | NetworkNav",
  description: "Create your NetworkNav account and start networking with leaders",
};

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-md animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-display">Create Your Account</CardTitle>
        <CardDescription>
          Join the leadership network and discover meaningful connections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-96 shimmer rounded-lg" />}>
          <RegisterForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

