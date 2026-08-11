import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/templates")({
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminTemplatesPage",
  ),
});
