"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="max-w-md space-y-2">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. You can try again or return home."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Back to log in</Link>
        </Button>
      </div>
    </div>
  );
}
