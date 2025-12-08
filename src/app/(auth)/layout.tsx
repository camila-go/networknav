import Link from "next/link";
import { Users } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen gradient-mesh flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-navy-900">
            NetworkNav
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-navy-500">
        © {new Date().getFullYear()} NetworkNav. Built for leaders, by leaders.
      </footer>
    </div>
  );
}

