import Link from "next/link";
import { ArrowRight, Users, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen gradient-mesh">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-navy-900">
              NetworkNav
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-navy-700">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-primary hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Leadership Matching</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-navy-900 mb-6 leading-tight animate-fade-in [animation-delay:100ms]">
            Find Your Perfect
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary via-teal-500 to-coral-500">
              Leadership Connections
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-navy-600 mb-10 max-w-2xl mx-auto animate-fade-in [animation-delay:200ms]">
            NetworkNav uses market basket analysis to intelligently match you with 
            fellow leaders who share your challenges, complement your expertise, 
            and align with your goals.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in [animation-delay:300ms]">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-lg px-8 py-6">
                Start Networking
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6">
                How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="container mx-auto px-4 py-20">
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
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-navy-800 to-navy-900 rounded-3xl p-12 text-white">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Conference Networking?
          </h2>
          <p className="text-navy-200 text-lg mb-8">
            Complete a quick 6-8 minute questionnaire and unlock personalized matches 
            designed to maximize your conference experience.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-coral-500 hover:bg-coral-600 text-white text-lg px-8">
              Create Your Profile
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-navy-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-navy-500">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center">
              <Users className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium text-navy-700">NetworkNav</span>
          </div>
          <p>© {new Date().getFullYear()} NetworkNav. Built for leaders, by leaders.</p>
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
    <div
      className="bg-white/60 glass rounded-2xl p-8 border border-navy-100 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/10 to-teal-500/10 flex items-center justify-center text-primary mb-6">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold text-navy-900 mb-3">
        {title}
      </h3>
      <p className="text-navy-600 leading-relaxed">{description}</p>
    </div>
  );
}

