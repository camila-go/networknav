import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// DM Sans - Clean, geometric sans-serif for body text (excellent readability)
const dmSans = DM_Sans({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Fraunces - Distinctive serif for headings (elegant, professional)
const fraunces = Fraunces({ 
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NetworkNav - Leadership Conference Networking",
  description:
    "Intelligent networking for leadership conferences. Find your perfect professional connections through data-driven matching.",
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
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

