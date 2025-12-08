import Link from "next/link";
import { ArrowRight, Users, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen gradient-mesh">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="container mx-auto px-4 py-6" role="banner">
        <nav className="flex items-center justify-between" aria-label="Main navigation">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="font-display text-xl font-bold text-navy-800">
              Jynx
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-navy-700 hover:text-navy-900">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="main-content" className="container mx-auto px-4 py-20 md:py-32" role="main">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-semibold mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>AI-Powered Leadership Matching</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-navy-900 mb-6 leading-tight animate-fade-in [animation-delay:100ms]">
            Find Your Perfect
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-500 to-coral-600">
              Leadership Connections
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-navy-600 mb-10 max-w-2xl mx-auto animate-fade-in [animation-delay:200ms]">
            Jynx uses market basket analysis to intelligently match you with 
            fellow leaders who share your challenges, complement your expertise, 
            and align with your goals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in [animation-delay:300ms]">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white text-lg px-8 py-6">
                Start Networking
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 border-navy-300 text-navy-700 hover:bg-navy-50">
                How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">How Jynx Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="High-Affinity Matches"
            description="Connect with leaders who share your industry, challenges, and interests for peer support and mutual understanding."
            delay={0}
          />
          <FeatureCard
            icon={<Sparkles className="h-8 w-8" />}
            title="Strategic Matches"
            description="Discover leaders with complementary expertise to expand your perspective and create valuable partnerships."
            delay={100}
          />
          <FeatureCard
            icon={<MessageCircle className="h-8 w-8" />}
            title="Meaningful Conversations"
            description="Get AI-powered conversation starters based on your commonalities to break the ice and build real connections."
            delay={200}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20" aria-labelledby="cta-heading">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-navy-800 to-navy-900 rounded-3xl p-12">
          <h2 id="cta-heading" className="font-display text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to Transform Your Conference Networking?
          </h2>
          <p className="text-navy-200 text-lg mb-8">
            Complete a quick 6-8 minute questionnaire and unlock personalized matches 
            designed to maximize your conference experience.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-coral-500 hover:bg-coral-600 text-white text-lg px-8">
              Create Your Profile
              <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-navy-200" role="contentinfo">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-navy-600">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center">
              <Users className="h-3 w-3 text-white" aria-hidden="true" />
            </div>
            <span className="font-medium text-navy-700">Jynx</span>
          </div>
          <p>© {new Date().getFullYear()} Jynx. Built for leaders, by leaders.</p>
        </div>
      </footer>
    </main>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <article
      className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-navy-200 hover:border-teal-300 transition-all duration-300 hover:shadow-lg hover:shadow-teal-500/10 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-14 w-14 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 mb-6" aria-hidden="true">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-navy-800 mb-3">
        {title}
      </h3>
      <p className="text-navy-600 leading-relaxed">{description}</p>
    </article>
  );
}

