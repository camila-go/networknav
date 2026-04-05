import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/nav";
import { MobileBottomNav } from "@/components/dashboard/mobile-nav";
import { JynxNetworkFab } from "@/components/dashboard/jynx-network-fab";
import { OnboardingModalHost } from "@/components/onboarding";

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
    <div className="min-h-screen bg-black text-white">
      <DashboardNav />
      <main className="container mx-auto px-4 py-8 pb-24 lg:pb-8">{children}</main>
      <MobileBottomNav />
      <JynxNetworkFab />
      <OnboardingModalHost />
    </div>
  );
}

