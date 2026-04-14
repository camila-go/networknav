import { AdminProjectorDashboard } from "@/components/admin/admin-projector-dashboard";

export const metadata = {
  title: "Gallery projector | Admin",
  description:
    "Live 16:9 stats dashboard showing top gallery activities with rotating photo highlight",
};

export default function AdminGalleryDisplayPage() {
  return <AdminProjectorDashboard />;
}
