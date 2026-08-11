import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { requireAdmin } from "@/features/admin/utils/requireAdmin";

/**
 * Khung khu quản trị — thanh bên + thanh tiêu đề, nội dung từng tab đi vào `<Outlet />`.
 *
 * Đây là route CHA của cả bảy tab, nên `beforeLoad` ở đây gác cho toàn khu và sáu file
 * route con không phải lặp lại nữa. Nó chạy TRƯỚC khi tải mã màn hình nên phải nạp sẵn;
 * chỉ màn hình mới tải theo nhu cầu.
 *
 * Trước đây `/admin` là route LÁ ngang hàng với sáu tab kia, nên đổi tab là dựng lại cả
 * thanh bên lẫn thanh tiêu đề từ đầu.  #Huynh
 */
export const Route = createFileRoute("/admin")({
  beforeLoad: requireAdmin,
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminLayout",
  ),
});
