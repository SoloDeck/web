import { createFileRoute, redirect } from "@tanstack/react-router";

import { LandingPage } from "@/features/marketing/components/LandingPage";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

export const Route = createFileRoute("/home")({
  beforeLoad: () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated) {
      // User đã đăng nhập thì /home không nên mở lại flow login/landing.
      throw redirect({ to: user?.role === "admin" ? "/admin" : "/", replace: true });
    }
  },
  component: LandingPage,
});
