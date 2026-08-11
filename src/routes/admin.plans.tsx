import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

export const Route = createFileRoute("/admin/plans")({
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminPlansPage",
  ),
});
