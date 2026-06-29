import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

export const Route = createFileRoute("/admin")({
  beforeLoad: requireAdmin,
  component: AdminRoute,
});

function AdminRoute() {
  return <AdminDashboard page="dashboard" />;
}
