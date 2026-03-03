import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/nav";
import { MobileBottomNav } from "@/components/dashboard/mobile-nav";
import { OnboardingProvider } from "@/components/onboarding";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-black text-white">
        <DashboardNav />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">{children}</main>
        <MobileBottomNav />
      </div>
    </OnboardingProvider>
  );
}

