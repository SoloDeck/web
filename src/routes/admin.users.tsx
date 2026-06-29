import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

export const Route = createFileRoute("/admin/users")({
  beforeLoad: requireAdmin,
  component: AdminUsersRoute,
});

function AdminUsersRoute() {
  return <AdminDashboard page="users" />;
}
