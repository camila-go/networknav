import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Inter - single clean sans for UI + headings (matches Global Summit 2026 creative)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GS26 — Leadership Conference Networking",
  description:
    "Global Summit 2026 networking (powered by JYNX). Find your professional matches through data-driven matching.",
  keywords: [
    "leadership",
    "networking",
    "conference",
    "professional connections",
    "market basket analysis",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="min-h-screen bg-background font-sans antialiased"
        suppressHydrationWarning
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

