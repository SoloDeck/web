import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

// Đường dẫn đã phát cho khách hàng từ trước — phải giữ chạy. Render cùng trang với /ho-so.
export const Route = createFileRoute("/bieu-mau/$token")({
  component: lazyRouteComponent(
    () => import("@/features/intake/components/publicShareRoutes"),
    "BieuMauPage",
  ),
});
