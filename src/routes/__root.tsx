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
  const syncFromStorage = useAuthStore((s) => s.syncFromStorage);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (isAuthenticated) hydrate();
  }, [isAuthenticated, hydrate]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key === "solodesk.auth.session.v1" ||
        event.key === "solodesk.auth.refresh.v1"
      ) {
        // Đồng bộ login/logout giữa các tab để một browser không giữ hai tài khoản.
        syncFromStorage();
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [syncFromStorage]);

  return <Outlet />;
}
