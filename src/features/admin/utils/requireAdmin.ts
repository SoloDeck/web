import { redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

/** Chặn route admin: chưa login về landing, không phải admin về workspace thường. */
export function requireAdmin() {
  const { isAuthenticated, user } = useAuthStore.getState();
  if (!isAuthenticated) {
    throw redirect({ to: "/home", replace: true });
  }
  if (user?.role !== "admin") {
    throw redirect({ to: "/", replace: true });
  }
}
