import Link from "next/link";
import { ArrowRight, Users, Sparkles, MessageCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generate dot data for the radial matrix
function generateDots() {
  const rings = 12;
  const dots: { x: number; y: number; color: string; size: number; delay: number; floatDuration: number; twinkleDuration: number }[] = [];
  
  for (let ring = 1; ring <= rings; ring++) {
    const dotsInRing = ring * 8;
    const radius = ring * 35;
    
    for (let i = 0; i < dotsInRing; i++) {
      const angle = (i / dotsInRing) * Math.PI * 2;
      const x = 50 + Math.cos(angle) * radius / 4;
      const y = 50 + Math.sin(angle) * radius / 4;
      
      // Color spectrum based on angle (rainbow effect)
      const hue = (angle * 180 / Math.PI + ring * 15) % 360;
      const saturation = 100 - ring * 3;
      const lightness = 60 - ring * 2;
      const opacity = Math.max(0.3, 1 - ring * 0.06);
      
      dots.push({
        x,
        y,
        color: `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`,
        size: Math.max(2, 6 - ring * 0.3),
        delay: (ring * 0.3) + (i * 0.02),
        floatDuration: 4 + (ring % 3),
        twinkleDuration: 6 + (i % 4),
      });
    }
  }
  return dots;
}

// Radial dot matrix component with subtle floating animation
function RadialDotMatrix() {
  const dots = generateDots();

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Animated dots with floating effect */}
        {dots.map((dot, index) => (
          <circle
            key={index}
            cx={dot.x}
            cy={dot.y}
            r={dot.size / 10}
            fill={dot.color}
            className="animate-dot"
            style={{ 
              '--animation-delay': `${dot.delay}s`,
              '--float-duration': `${dot.floatDuration}s`,
              '--twinkle-duration': `${dot.twinkleDuration}s`,
            } as React.CSSProperties}
          />
        ))}
      </svg>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass" role="banner">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <span className="font-bold text-black text-lg">J</span>
            </div>
            <span className="font-display text-xl font-bold tracking-wide">
              JYNX
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-semibold shadow-lg shadow-cyan-500/30">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section with Radial Dots */}
      <section id="main-content" className="relative min-h-screen flex items-center justify-center overflow-hidden" role="main">
        <RadialDotMatrix />
        
        {/* Content overlay with backdrop for legibility */}
        <div className="relative z-10 container mx-auto px-4 py-32 text-center">
          {/* Content card with dark backdrop for legibility */}
          <div className="relative mx-auto max-w-3xl rounded-3xl bg-black/60 backdrop-blur-md p-8 md:p-12 border border-white/10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/50 bg-cyan-500/20 text-cyan-300 text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>GLOBAL LEADERSHIP SUMMIT 2026</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight animate-fade-in [animation-delay:100ms]">
              <span className="block text-white drop-shadow-lg">
                Jynx: Because Great Minds Connect Alike
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-cyan-300 mb-8 animate-fade-in [animation-delay:150ms]">
              Find Your Perfect Leadership Connections
            </p>
            
            <p className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl mx-auto animate-fade-in [animation-delay:200ms] leading-relaxed">
              Our AI-powered matching identifies high-affinity peers who share your challenges 
              and strategic connections who complement your expertise.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in [animation-delay:300ms]">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto text-lg px-10 h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-semibold shadow-xl shadow-cyan-500/30 border-0">
                  Start Networking
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-10 h-14 border-white/30 text-white hover:bg-white/10 hover:border-white/50">
                  How It Works
                </Button>
              </Link>
            </div>

            {/* Event details badge */}
            <div className="mt-10 animate-fade-in [animation-delay:400ms]">
              <div className="inline-flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <span>APRIL 30 – MAY 2, 2026</span>
                </div>
                <div className="hidden sm:block w-px h-4 bg-white/30" />
                <span>Disney&apos;s Grand Floridian Resort</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 rounded-full bg-white/50" />
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
              description="Connect with leaders who share your industry, challenges, and interests for peer support and mutual understanding."
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
              <Button size="lg" className="text-lg px-12 h-14 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-semibold shadow-xl shadow-cyan-500/30">
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
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center">
                <span className="font-bold text-black text-sm">J</span>
              </div>
              <span className="font-display font-bold tracking-wide">JYNX</span>
            </div>
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
  icon: React.ReactNode;
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
