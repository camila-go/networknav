import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Users, Sparkles, MessageCircle, Calendar } from "lucide-react";
import { Gs26LockupLink } from "@/components/brand/gs26-lockup-link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Global Summit 2026 | JYNX",
  description:
    "Transform your conference experience. Answer a few quick questions to unlock AI-powered matches with peers and leaders who complement your expertise.",
};

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass pt-[env(safe-area-inset-top)]" role="banner">
        <nav
          className="container mx-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-3 px-4 py-3 sm:gap-y-4 sm:py-4"
          aria-label="Main navigation"
        >
          <Gs26LockupLink href="/welcome" className="max-w-[55%] sm:max-w-none" />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link href="/login" className="min-h-[44px] min-w-[44px] sm:min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 px-3 text-sm text-white/80 hover:text-white hover:bg-white/10 sm:h-11 sm:px-4 sm:text-base"
              >
                Log In
              </Button>
            </Link>
            <Link href="/register" className="min-h-[44px]">
              <Button
                size="sm"
                className="h-10 px-3 text-sm font-semibold sm:h-11 sm:px-4 sm:text-base"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/*
        Hero / WCAG: lockup in pale disk only; headline + body live together (navy band mobile, zinc card md+).
        Body copy never on the dot field without an opaque surface.
      */}
      <section
        id="main-content"
        className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-x-hidden overflow-y-visible scroll-mt-28 pb-16 pt-[max(6.5rem,calc(env(safe-area-inset-top)+5.25rem))] md:scroll-mt-36 md:justify-center md:pb-20 md:pt-[max(9rem,calc(env(safe-area-inset-top)+8rem))] lg:pt-[max(9.5rem,calc(env(safe-area-inset-top)+8.5rem))]"
        role="main"
      >
        {/* Desktop: heavy scrim so intro/CTAs sit over near-black (AA with white type) */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] hidden h-[min(65vh,680px)] bg-gradient-to-t from-black via-black/95 to-black/20 backdrop-blur-md md:block"
          aria-hidden
        />

        <div className="relative z-20 mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-[env(safe-area-inset-bottom)] text-center sm:px-5">
          {/*
            Badge min-height matches orb scale; lockup centered on the white disk.
          */}
          <div className="relative mb-0 w-full max-w-[min(100vw,860px)] min-h-[min(100vw,480px)] md:mb-8 md:min-h-[min(58vh,640px)] lg:min-h-[min(56vh,660px)]">
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
              aria-hidden
            >
              <div className="aspect-square w-[min(290vw,2500px)] max-w-none origin-center animate-radiant-breathe motion-reduce:animate-none md:w-[min(172vmin,3000px)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- large decorative path SVG */}
                <img
                  src="/brand/radiant-colors-reference.svg"
                  alt=""
                  className="h-full w-full object-cover object-center"
                  width={3245}
                  height={3245}
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </div>
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-[1] h-[min(100vw,680px)] w-[min(100vw,680px)] -translate-x-1/2 -translate-y-1/2 animate-fade-in-opacity motion-reduce:animate-none rounded-full shadow-[0_0_80px_rgba(255,255,255,0.35)] md:h-[min(min(62vh,74vw),760px)] md:w-[min(min(62vh,74vw),760px)]"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, #ffffff 0%, #ffffff 58%, #f0fdfa 85%, #e0f2fe 100%)",
              }}
              aria-hidden
            />
            <div className="absolute left-1/2 top-1/2 z-[2] flex w-[min(88vw,360px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-3 px-4 py-2 animate-fade-in-opacity motion-reduce:animate-none sm:w-[min(84vw,380px)] md:w-[min(44vmin,400px)] md:gap-4 md:px-6 lg:w-[min(42vmin,400px)]">
              <Image
                src="/brand/hero-lockup.svg"
                alt="JYNX - Connecting Leaders by AI"
                width={888}
                height={497}
                priority
                className="h-auto w-full max-w-[min(85vw,58vmin,380px)] drop-shadow-[0_12px_28px_rgba(0,0,0,0.12)] sm:max-w-[min(82vw,56vmin,400px)] md:max-w-[min(50vmin,440px)] lg:max-w-[min(48vmin,480px)]"
              />
            </div>
          </div>

          <div className="relative z-20 -mx-4 mt-5 w-[calc(100%+2rem)] bg-[#0a1628] px-6 py-7 text-center sm:-mx-5 sm:mt-6 sm:w-[calc(100%+2.5rem)] md:hidden">
            <h1 className="mx-auto max-w-md font-display text-xl font-bold leading-snug tracking-tight text-lime-300 sm:text-2xl">
              Transform your conference experience
            </h1>
            <p className="mx-auto mt-4 max-w-md text-pretty text-sm font-medium leading-relaxed text-white antialiased sm:max-w-lg sm:text-base">
              Answer a few quick questions to unlock AI-powered matches with peers and leaders who
              complement your expertise – so you can connect, strategize and get more from Global Summit.
            </p>
          </div>


          {/*
            md+: single opaque surface (zinc-950 ≈ #09090b) behind intro + CTAs + meta — white on dots fails AA without this.
            z-30 over radiant overflow.
          */}
          <div className="relative z-30 mt-6 flex w-full max-w-lg flex-col items-center sm:mt-7 md:mt-5 md:max-w-2xl md:rounded-2xl md:border md:border-white/15 md:bg-zinc-950 md:px-6 md:pb-6 md:pt-6 md:shadow-[0_12px_48px_rgba(0,0,0,0.75)]">
            <h1 className="hidden w-full text-pretty text-center font-display text-2xl font-bold leading-snug tracking-tight text-lime-300 sm:text-[1.65rem] md:mb-4 md:block">
              Transform your conference experience
            </h1>
            <p className="hidden w-full text-pretty text-center text-sm font-medium leading-relaxed text-white antialiased sm:text-[0.95rem] md:mb-6 md:block">
              Answer a few quick questions to unlock AI-powered matches with peers and leaders who
              complement your expertise – so you can connect, strategize and get more from Global Summit.
            </p>
            <div className="mb-10 flex w-full max-w-md flex-col items-stretch justify-center gap-4 sm:max-w-none sm:flex-row sm:items-center sm:justify-center animate-fade-in [animation-delay:200ms] md:mb-10">
              <Link href="/register" className="w-full min-h-[48px] sm:w-auto sm:min-w-[12rem]">
                <Button
                  size="lg"
                  className="h-12 min-h-[48px] w-full border-0 px-8 text-base font-semibold sm:h-14 sm:px-10 sm:text-lg"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 shrink-0" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="#how-it-works" className="w-full min-h-[48px] sm:w-auto sm:min-w-[12rem]">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 min-h-[48px] w-full border-white/30 px-8 text-base text-white hover:border-white/50 hover:bg-white/10 sm:h-14 sm:px-10 sm:text-lg"
                >
                  How it works
                </Button>
              </Link>
            </div>

            <div className="animate-fade-in [animation-delay:260ms]">
              <div className="inline-flex max-w-full flex-col items-center gap-4 text-sm text-white sm:flex-row sm:gap-8">
                <div className="flex items-center justify-center gap-2 text-center">
                  <Calendar className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                  <span className="text-balance">April 30 – May 2, 2026</span>
                </div>
                <div className="hidden h-4 w-px bg-white/25 sm:block" />
                <span className="text-balance text-center">Disney&apos;s Grand Floridian Resort</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative only — never intercept taps or block CTAs */}
        <div
          className="pointer-events-none absolute bottom-4 left-1/2 z-[5] -translate-x-1/2 max-sm:bottom-3 sm:bottom-6"
          aria-hidden="true"
        >
          <div className="flex h-10 w-6 animate-bounce items-start justify-center rounded-full border-2 border-white/25 p-2">
            <div className="h-2 w-1 rounded-full bg-white/45" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="relative bg-black py-24" aria-labelledby="features-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="font-display text-3xl md:text-5xl font-bold mb-4">
              <span className="text-gradient">Energizing Leaders</span>
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Sparking future thinking and building resilience through meaningful connections
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="High-Affinity Matches"
              description="Connect with leaders who share your challenges and interests for peer support and mutual understanding."
              color="cyan"
              delay={0}
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="Strategic Matches"
              description="Discover leaders with complementary expertise to expand your perspective and create valuable partnerships."
              color="teal"
              delay={100}
            />
            <FeatureCard
              icon={<MessageCircle className="h-8 w-8" />}
              title="AI Conversation Starters"
              description="Get personalized talking points based on your commonalities to break the ice and build real connections."
              color="emerald"
              delay={200}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden" aria-labelledby="cta-heading">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-transparent blur-3xl" />
          </div>
        </div>
        
        <div className="relative container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center summit-card rounded-3xl p-12">
            <h2 id="cta-heading" className="font-display text-3xl md:text-5xl font-bold mb-6">
              <span className="text-white">Ready to Transform Your</span>
              <br />
              <span className="text-gradient">Conference Experience?</span>
            </h2>
            <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto">
              Complete a quick questionnaire and unlock personalized matches 
              designed to maximize your leadership journey.
            </p>
            <Link href="/register">
              <Button size="lg" className="h-14 px-12 text-lg font-semibold">
                Confirm Attendance
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12" role="contentinfo">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/welcome" className="flex shrink-0 items-center opacity-90 hover:opacity-100">
              <Image
                src="/lockup-jynx.svg"
                alt="JYNX GS26"
                width={160}
                height={37}
                className="h-7 w-auto sm:h-8"
              />
            </Link>
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} Strategic Education. Proprietary and confidential.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: "cyan" | "teal" | "emerald";
  delay: number;
}

function FeatureCard({ icon, title, description, color, delay }: FeatureCardProps) {
  const colorStyles = {
    cyan: {
      iconBg: "bg-cyan-500/20",
      iconText: "text-cyan-400",
      border: "hover:border-cyan-500/30",
      glow: "hover:shadow-cyan-500/10",
    },
    teal: {
      iconBg: "bg-teal-500/20",
      iconText: "text-teal-400",
      border: "hover:border-teal-500/30",
      glow: "hover:shadow-teal-500/10",
    },
    emerald: {
      iconBg: "bg-emerald-500/20",
      iconText: "text-emerald-400",
      border: "hover:border-emerald-500/30",
      glow: "hover:shadow-emerald-500/10",
    },
  };

  const styles = colorStyles[color];

  return (
    <article
      className={`summit-card rounded-2xl p-8 transition-all duration-500 hover:shadow-2xl ${styles.border} ${styles.glow} animate-fade-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`h-14 w-14 rounded-xl ${styles.iconBg} flex items-center justify-center ${styles.iconText} mb-6`} aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-white mb-3">
        {title}
      </h3>
      <p className="text-white/80 leading-relaxed">{description}</p>
    </article>
  );
}
