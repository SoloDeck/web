import { lazy, Suspense, useEffect } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

/**
 * `React.lazy` chứ không phải `lazyRouteComponent`: đây không phải component của route nào,
 * nên router không có chỗ để móc vào.
 *
 * Cần tách vì nó mount ở TẦNG GỐC, tức mọi trang đều gánh — kể cả `/home` và trang công
 * khai của freelancer, hai chỗ không đời nào mở panel AI. Nó kéo theo `AIPanel` và
 * `ProposalModal`.
 *
 * `fallback={null}`: khi chưa có job nào thì bản thân component cũng không vẽ gì, nên
 * "không vẽ gì" trong lúc chờ đúng là hình dạng bình thường của nó.  #Huynh
 */
// eslint-disable-next-line react-refresh/only-export-components
const AIJobViewer = lazy(() =>
  import("@/features/ai/components/AIJobViewer").then((m) => ({ default: m.AIJobViewer })),
);

export const Route = createRootRoute({
  component: RootComponent,
});

// eslint-disable-next-line react-refresh/only-export-components
function RootComponent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const syncFromStorage = useAuthStore((s) => s.syncFromStorage);

  // `fetchConfig()` chỉ gọi ở `App.tsx`. Trước đây gọi ở CẢ hai nơi, mà `useConfigStore`
  // không chống gọi trùng — nên mỗi lần khởi động bắn hai request `/config` giống hệt nhau.
  useEffect(() => {
    if (isAuthenticated) hydrate();
  }, [isAuthenticated, hydrate]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key === "solodesk.auth.session.v1" ||
        event.key === "solodesk.auth.refresh.v1"
      ) {
        // Đồng bộ login/logout giữa các tab để một browser không giữ hai tài khoản.
        syncFromStorage();
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [syncFromStorage]);

  return (
    <>
      <Outlet />
      {/* Panel AI sống ở tầng gốc nên bấm "Xem" trên thẻ job ở MÀN HÌNH NÀO cũng mở được,
          kể cả bảng Kanban. Trước đây nó nằm trong trang chi tiết deal nên ra ngoài là
          bấm không ăn gì.  #Huynh */}
      <Suspense fallback={null}>
        <AIJobViewer />
      </Suspense>
    </>
  );
}
