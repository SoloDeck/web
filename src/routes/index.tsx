import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";
import { getMe } from "@/services/usersService";
import { wasOnboardingSkipped } from "@/features/onboarding/skip";
import { NAV_KEYS, type IndexSearch, type NavKey } from "@/features/workspace/navKeys";

// Thân màn hình đã dời sang `features/workspace/components/WorkspaceScreen.tsx`. File này
// từng là chỗ neo NẶNG NHẤT của gói khởi động: nó import Kanban, hồ sơ khách, doanh thu,
// gói dịch vụ, cấu hình trang công khai… nên khách lạ vào trang giới thiệu cũng phải tải
// hết. Giờ chỉ còn phần router bắt buộc phải có sẵn: `validateSearch` (chạy khi khớp URL)
// và `beforeLoad` (chạy trước khi tải mã màn hình).  #Huynh
export const Route = createFileRoute("/")({
  // Tab hiện tại được lưu ở query param `?tab=` để nút back và link chia sẻ mở đúng màn hình.
  validateSearch: (search: Record<string, unknown>): IndexSearch => {
    const tab = search.tab as NavKey | undefined;
    return { tab: tab && NAV_KEYS.includes(tab) ? tab : undefined };
  },
  beforeLoad: async () => {
    const { isAuthenticated, user } = useAuthStore.getState();
    if (!isAuthenticated) {
      throw redirect({ to: "/home", replace: true });
    }
    if (user?.role === "admin") {
      throw redirect({ to: "/admin", replace: true });
    }

    // Chặn ở đây chứ không chỉ ở cửa đăng nhập: người đang có sẵn phiên đăng nhập
    // mở thẳng app sẽ không đi qua /login, nên nếu chỉ gác ở đó thì họ không bao
    // giờ được hỏi. Ai bấm "Bỏ qua" trong phiên này thì để yên.
    if (wasOnboardingSkipped()) return;

    let me = null;
    try {
      me = await getMe();
    } catch {
      // Lỗi mạng: đừng chặn người dùng ở cửa, cứ cho vào workspace.
    }

    // redirect() điều hướng bằng cách ném — phải nằm ngoài try/catch ở trên.
    if (me && !me.professional_profile?.specialization) {
      throw redirect({ to: "/onboarding", replace: true });
    }
  },
  component: lazyRouteComponent(
    () => import("@/features/workspace/components/WorkspaceScreen"),
    "WorkspaceScreen",
  ),
});
