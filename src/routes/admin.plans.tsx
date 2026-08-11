import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/plans")({
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminPlansPage",
  ),
});
