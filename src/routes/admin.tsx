import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

// `beforeLoad` ở lại đây — nó chạy TRƯỚC khi tải mã màn hình nên phải nạp sẵn; chỉ màn hình
// mới tải theo nhu cầu. Sáu route admin trỏ chung một module nên dùng chung một chunk.
export const Route = createFileRoute("/admin")({
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminDashboardPage",
  ),
});
