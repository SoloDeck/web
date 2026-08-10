import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

// Public, unauthenticated route — no beforeLoad auth guard. The owner is
// resolved server-side from the share token in the path.
//
// Giữ lại vì link cũ dạng /intake/{token} đã được phát ra ngoài; render cùng trang với
// /ho-so và /bieu-mau.
export const Route = createFileRoute("/intake/$token")({
  component: lazyRouteComponent(
    () => import("@/features/intake/components/publicShareRoutes"),
    "IntakePage",
  ),
});
