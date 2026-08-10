import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";

import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { getMe } from "@/services/usersService";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) throw redirect({ to: "/login", replace: true });
    if (user?.role === "admin") throw redirect({ to: "/admin", replace: true });

    // BE không có cờ `onboarding_completed`, nên "đã onboard" được suy ra từ việc
    // hồ sơ chuyên môn đã có dữ liệu. Ai điền rồi thì không bị hỏi lại.
    // redirect() hoạt động bằng cách ném — nên nó phải nằm NGOÀI try/catch,
    // không thì chính catch ở đây nuốt mất lệnh điều hướng.
    let me = null;
    try {
      me = await getMe();
    } catch {
      // Lỗi mạng: cứ cho vào wizard, còn hơn chặn người dùng ở cửa.
    }

    if (me?.professional_profile?.specialization) {
      throw redirect({ to: "/", replace: true });
    }
  },
  component: lazyRouteComponent(
    () => import("@/features/onboarding/components/OnboardingWizard"),
    "OnboardingWizard",
  ),
});
