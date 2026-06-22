import { useEffect } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { useConfigStore } from "@/features/auth/hooks/useConfigStore";

export const Route = createRootRoute({
  component: RootComponent,
});

// eslint-disable-next-line react-refresh/only-export-components
function RootComponent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (isAuthenticated) hydrate();
  }, [isAuthenticated, hydrate]);

  return <Outlet />;
}
