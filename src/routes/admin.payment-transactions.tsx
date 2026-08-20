import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/payment-transactions")({
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminPaymentTransactionsPage",
  ),
});
