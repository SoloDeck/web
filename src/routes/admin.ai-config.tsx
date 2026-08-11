import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

/**
 * Tab "Cấu hình AI".
 *
 * File này từng bị để RỖNG 0 byte, trong khi thanh bên vẫn trỏ tới `/admin/ai-config` và
 * màn hình `AdminAiConfigPage` đã nằm sẵn trong repo — nên bấm vào tab là ra 404 dù mã
 * màn hình có đủ từ lâu. Không ai phát hiện vì `routeTree.gen.ts` được sửa tay, không có
 * công cụ nào sinh lại để lộ chỗ thiếu.  #Huynh
 */
export const Route = createFileRoute("/admin/ai-config")({
  component: lazyRouteComponent(
    () => import("@/features/admin/components/adminPages"),
    "AdminAiConfigPage",
  ),
});
