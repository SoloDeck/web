import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

export const Route = createFileRoute("/admin/audit")({
  beforeLoad: requireAdmin,
  component: AdminAuditRoute,
});

function AdminAuditRoute() {
  return <AdminDashboard page="audit" />;
}
