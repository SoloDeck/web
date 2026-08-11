import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

export const Route = createFileRoute("/admin/ai-config")({
  beforeLoad: requireAdmin,
  component: AdminAiConfigRoute,
});

function AdminAiConfigRoute() {
  return <AdminDashboard page="ai-config" />;
}