import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin" && session.role !== "moderator") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white md:flex-row">
      <AdminSidebar role={session.role} />
      <main className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-5 md:p-6">
        {children}
      </main>
    </div>
  );
}
