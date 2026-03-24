import { Gs26LockupLink } from "@/components/brand/gs26-lockup-link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-[120px]" />
      </div>

      {/* Header — GS26 lockup matches marketing site */}
      <header className="relative z-10 p-6">
        <Gs26LockupLink />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-white/40">
        © {new Date().getFullYear()} Strategic Education. Proprietary and confidential.
      </footer>
    </div>
  );
}

