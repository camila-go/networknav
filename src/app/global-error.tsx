"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-[#020202] font-sans text-white antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="max-w-md space-y-2">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-sm text-white/70">
              {error.message || "A critical error occurred. Try reloading the page."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-[#0A6171] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0c7586]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
