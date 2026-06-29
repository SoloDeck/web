import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

export const Route = createFileRoute("/admin/plans")({
  beforeLoad: requireAdmin,
  component: AdminPlansRoute,
});

function AdminPlansRoute() {
  return <AdminDashboard page="plans" />;
}
