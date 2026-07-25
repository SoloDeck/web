import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

export const Route = createFileRoute("/admin/ai-costs")({
  beforeLoad: requireAdmin,
  component: AdminAiCostsRoute,
});

function AdminAiCostsRoute() {
  return <AdminDashboard page="ai-costs" />;
}
