import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

// Trang công khai của freelancer. Ba đường dẫn (/ho-so, /bieu-mau, /intake) cùng render một
// trang: hồ sơ ở trên, biểu mẫu tiếp nhận ngay dưới.
export const Route = createFileRoute("/ho-so/$token")({
  component: lazyRouteComponent(
    () => import("@/features/intake/components/publicShareRoutes"),
    "HoSoPage",
  ),
});
