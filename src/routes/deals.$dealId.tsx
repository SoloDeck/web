import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { parseDealSearch } from "@/features/deals/dealSearch";

export const Route = createFileRoute("/deals/$dealId")({
  // `?tab=` / `?invoice=` / `?reminder=` — để thông báo mở thẳng đúng chỗ. Xem `dealSearch.ts`.
  validateSearch: parseDealSearch,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/home", replace: true });
    }
  },
  component: lazyRouteComponent(
    () => import("@/features/deals/components/DealDetailRoute"),
    "DealDetailRoute",
  ),
});
