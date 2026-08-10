import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

export const Route = createFileRoute("/clients/$clientId")({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: "/home", replace: true });
    }
  },
  component: lazyRouteComponent(
    () => import("@/features/clients/components/ClientDetailRoute"),
    "ClientDetailRoute",
  ),
});
