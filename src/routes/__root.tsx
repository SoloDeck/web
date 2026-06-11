import { useEffect } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    if (isAuthenticated) hydrate();
  }, [isAuthenticated, hydrate]);

  return <Outlet />;
}
