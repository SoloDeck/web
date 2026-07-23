import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

export const Route = createFileRoute("/admin/templates")({
  beforeLoad: requireAdmin,
  component: AdminTemplatesRoute,
});

function AdminTemplatesRoute() {
  return <AdminDashboard page="templates" />;
}
