import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/ai-costs")({
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminAiCostsPage",
  ),
});
