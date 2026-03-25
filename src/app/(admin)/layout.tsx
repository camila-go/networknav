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
    <div className="min-h-screen bg-black text-white flex">
      <AdminSidebar role={session.role} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
