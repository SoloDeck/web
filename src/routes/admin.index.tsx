import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

/**
 * Tab "Tổng quan" tại `/admin`.
 *
 * Phải là một route INDEX riêng chứ không gộp vào khung: route khung render `component`
 * của nó rồi để `<Outlet />` vẽ CON đang khớp — không có con index thì đứng ở `/admin`
 * cái `<Outlet />` vẽ ra rỗng.
 *
 * Quyền do route cha `/admin` gác, ở đây không khai lại.
 */
export const Route = createFileRoute("/admin/")({
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminDashboardPage",
  ),
});
