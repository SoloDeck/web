import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import type { RouterHistory } from "@tanstack/react-router";
import { Spinner } from "@/components/ui/spinner";
import { routeTree } from "./routeTree.gen";

/**
 * Màn chờ khi router đang tải mã của trang sắp vào.
 *
 * Để component ở ngay đây thay vì tách file riêng: sửa `router.tsx` thì Vite nạp lại cả
 * trang chứ không hot-reload từng phần, nên độ mịn HMR mà luật này bảo vệ không có ý nghĩa
 * ở file này — đúng lý do `routes/__root.tsx` cũng tắt luật.
 */
// eslint-disable-next-line react-refresh/only-export-components
function RoutePending() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}

/**
 * `history` chỉ được truyền ở bước dựng sẵn HTML (`src/entry-server.tsx`), nơi không có
 * thanh địa chỉ để router đọc — bỏ trống thì router tự dùng history của trình duyệt như cũ.
 */
export const getRouter = (history?: RouterHistory) => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Hai tuỳ chọn này là điều kiện cần để tách mã theo route không làm xấu trải nghiệm:
    //
    // `defaultPreload: "intent"` — rê chuột (hoặc chạm) lên một link là router tải trước
    //   mã của đích. Đường mạng ở VN đủ để lấy xong chunk trong quãng từ lúc rê tới lúc
    //   bấm, nên phần lớn lần chuyển trang không thấy màn chờ nào.
    // `defaultPendingComponent` — cho những lần không kịp. Không đặt thì router dựng
    //   khoảng trắng trơn, người dùng không biết là đang tải hay là hỏng.
    //
    // Router mặc định đợi 1 giây rồi mới dựng màn chờ, nên chuyển trang nhanh vẫn không
    // thấy chớp spinner.  #Huynh
    defaultPreload: "intent",
    defaultPendingComponent: RoutePending,
  });

  return router;
};
